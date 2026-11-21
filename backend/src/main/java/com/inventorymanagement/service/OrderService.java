package com.inventorymanagement.service;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.CartDtos.CartTotals;
import com.inventorymanagement.dto.OrderDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.enums.*;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import com.inventorymanagement.util.Hashing;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {
    static final String SCOPE_CREATE = "ORDER_CREATE";
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
        OrderStatus.CONFIRMED, Set.of(OrderStatus.PROCESSING),
        OrderStatus.PROCESSING, Set.of(OrderStatus.PACKED),
        OrderStatus.PACKED, Set.of(OrderStatus.SHIPPED),
        OrderStatus.SHIPPED, Set.of(OrderStatus.OUT_FOR_DELIVERY),
        OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED));

    private final SalesOrderRepository orders;
    private final CartRepository carts;
    private final AddressRepository addresses;
    private final IdempotencyRepository idempotency;
    private final OrderStatusHistoryRepository historyRepo;
    private final OrderHistoryRecorder history;
    private final InventoryService inventory;
    private final PaymentService payments;
    private final PriceCalculator calculator;
    private final AuditService audit;
    private final ObjectMapper mapper;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    /**
     * TX1 of the order flow. In one transaction: idempotency guard, re-price from DB, lock + reserve stock
     * (products processed in ascending id order to keep lock order consistent), create order, clear cart.
     * Any failure rolls everything back, including the idempotency record, so the client can retry the same key.
     */
    @Transactional
    public OrderResponse placeOrder(Long userId, PlaceOrderRequest req, String idemKey) {
        String hash = Hashing.sha256Hex("address:" + req.addressId());
        Optional<IdempotencyRecord> prior = idempotency.findByUserIdAndScopeAndIdemKey(userId, SCOPE_CREATE, idemKey);
        if (prior.isPresent()) {
            IdempotencyRecord rec = prior.get();
            if (!rec.getRequestHash().equals(hash)) throw new BusinessRuleViolationException("Idempotency-Key was already used with a different request");
            return toResponse(orders.findDetailById(rec.getResourceId()).orElseThrow());
        }
        // A concurrent request with the same key blocks here on the unique index, then fails with a conflict (409).
        IdempotencyRecord rec = new IdempotencyRecord();
        rec.setUserId(userId); rec.setScope(SCOPE_CREATE); rec.setIdemKey(idemKey); rec.setRequestHash(hash);
        rec = idempotency.saveAndFlush(rec);

        Cart cart = carts.findWithItemsByUserId(userId).filter(c -> !c.getItems().isEmpty()).orElseThrow(() -> new InvalidOrderException("Your cart is empty"));
        Address addr = addresses.findByIdAndUserIdAndDeletedAtIsNull(req.addressId(), userId).orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        List<CartItem> items = cart.getItems().stream().sorted(Comparator.comparing(ci -> ci.getProduct().getId())).toList();
        for (CartItem ci : items) {
            Product p = ci.getProduct();
            if (!p.isActive() || p.getDeletedAt() != null) throw new InvalidOrderException(p.getName() + " is no longer available");
        }
        CartTotals t = calculator.calculate(items.stream().map(ci -> new PriceCalculator.Line(ci.getProduct(), ci.getQuantity())).toList());

        SalesOrder o = new SalesOrder();
        o.setUserId(userId);
        o.setOrderNumber(newOrderNumber());
        String snapshot = snapshot(addr);
        o.setShippingAddress(snapshot);
        o.setBillingAddress(snapshot);
        o.setSubtotal(t.subtotal()); o.setDiscountTotal(t.discount()); o.setTaxTotal(t.tax()); o.setShippingFee(t.shipping()); o.setTotal(t.total());
        o.setOrderStatus(OrderStatus.PENDING);
        o.setPaymentStatus(PaymentStatus.PENDING);
        o.setExpiresAt(Instant.now().plus(props.order().reservationTtl()));
        o = orders.saveAndFlush(o);

        for (CartItem ci : items) {
            Product p = ci.getProduct();
            Long warehouseId = inventory.reserve(p.getId(), ci.getQuantity(), o.getId(), userId);
            OrderItem oi = new OrderItem();
            oi.setOrder(o); oi.setProductId(p.getId()); oi.setWarehouseId(warehouseId);
            oi.setProductName(p.getName()); oi.setSku(p.getSku());                       // historical snapshot
            oi.setListPrice(p.getPrice()); oi.setUnitPrice(PriceCalculator.unitPrice(p)); oi.setTaxRate(p.getTaxRate());
            oi.setQuantity(ci.getQuantity());
            oi.setLineTotal(PriceCalculator.unitPrice(p).multiply(java.math.BigDecimal.valueOf(ci.getQuantity())));
            o.getItems().add(oi);
        }
        history.record(o.getId(), null, OrderStatus.PENDING, userId, "Order placed");
        cart.getItems().clear();
        rec.setResourceId(o.getId());
        log.info("Order placed id={} number={} total={}", o.getId(), o.getOrderNumber(), o.getTotal());
        return toResponse(o);
    }

    @Transactional(readOnly = true)
    public OrderResponse getForCustomer(Long userId, Long id) {
        SalesOrder o = orders.findDetailById(id).filter(x -> x.getUserId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toResponse(o);
    }

    @Transactional(readOnly = true)
    public OrderResponse getForAdmin(Long id) { return toResponse(orders.findDetailById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found"))); }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> listForCustomer(Long userId, Pageable p) { return PageResponse.of(orders.findByUserId(userId, p).map(this::summary)); }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> listForAdmin(OrderStatus status, LocalDate from, LocalDate to, String orderNumber, Pageable p) {
        Specification<SalesOrder> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) ps.add(cb.equal(root.get("orderStatus"), status));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay().toInstant(ZoneOffset.UTC)));
            if (to != null) ps.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            if (orderNumber != null && !orderNumber.isBlank()) ps.add(cb.equal(root.get("orderNumber"), orderNumber.trim().toUpperCase()));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        return PageResponse.of(orders.findAll(spec, p).map(this::summary));
    }

    /** Customers: PENDING/CONFIRMED only. Admins: also PROCESSING/PACKED. Never after shipment. */
    @Transactional
    public OrderResponse cancel(Long orderId, Long actorId, boolean admin, String reason) {
        SalesOrder o = orders.findByIdForUpdate(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!admin && !o.getUserId().equals(actorId)) throw new ResourceNotFoundException("Order not found");
        Set<OrderStatus> cancellable = admin
            ? Set.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED)
            : Set.of(OrderStatus.PENDING, OrderStatus.CONFIRMED);
        if (!cancellable.contains(o.getOrderStatus())) throw new BusinessRuleViolationException("An order in status " + o.getOrderStatus() + " cannot be cancelled");
        OrderStatus before = o.getOrderStatus();
        for (OrderItem it : o.getItems()) {
            if (before == OrderStatus.PENDING) inventory.releaseReservation(it.getProductId(), it.getWarehouseId(), it.getQuantity(), o.getId(), actorId, "Order cancelled");
            else inventory.restockCancelled(it.getProductId(), it.getWarehouseId(), it.getQuantity(), o.getId(), actorId);
        }
        if (before != OrderStatus.PENDING) payments.refundOnCancellation(o, actorId);
        o.setOrderStatus(OrderStatus.CANCELLED);
        history.record(o.getId(), before, OrderStatus.CANCELLED, actorId, reason == null ? "Cancelled" : reason);
        audit.record(actorId, "ORDER_CANCELLED", "ORDER", o.getId(), before, OrderStatus.CANCELLED);
        return toResponse(o);
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus next, String note, Long actorId) {
        if (next == OrderStatus.CANCELLED) return cancel(orderId, actorId, true, note);
        SalesOrder o = orders.findByIdForUpdate(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!TRANSITIONS.getOrDefault(o.getOrderStatus(), Set.of()).contains(next))
            throw new BusinessRuleViolationException("Cannot move order from " + o.getOrderStatus() + " to " + next);
        OrderStatus before = o.getOrderStatus();
        o.setOrderStatus(next);
        history.record(o.getId(), before, next, actorId, note);
        return toResponse(o);
    }

    /** Called by the scheduler, one order per transaction. Safe to run on several instances: row lock + status re-check. */
    @Transactional
    public void expire(Long orderId) {
        SalesOrder o = orders.findByIdForUpdate(orderId).orElse(null);
        if (o == null || o.getOrderStatus() != OrderStatus.PENDING || o.getExpiresAt() == null || o.getExpiresAt().isAfter(Instant.now())) return;
        for (OrderItem it : o.getItems())
            inventory.releaseReservation(it.getProductId(), it.getWarehouseId(), it.getQuantity(), o.getId(), null, "Reservation expired");
        o.setOrderStatus(OrderStatus.CANCELLED);
        history.record(o.getId(), OrderStatus.PENDING, OrderStatus.CANCELLED, null, "Unpaid order expired");
        log.info("Order {} expired, reservation released", o.getOrderNumber());
    }

    // ---------- mapping ----------
    private OrderSummary summary(SalesOrder o) {
        return new OrderSummary(o.getId(), o.getOrderNumber(), o.getUserId(), o.getOrderStatus(), o.getPaymentStatus(), o.getTotal(), o.getCreatedAt());
    }

    private OrderResponse toResponse(SalesOrder o) {
        List<OrderItemResponse> items = o.getItems().stream().map(i -> new OrderItemResponse(i.getId(), i.getProductId(), i.getProductName(), i.getSku(),
            i.getUnitPrice(), i.getTaxRate(), i.getQuantity(), i.getLineTotal())).toList();
        List<HistoryEntry> hist = historyRepo.findByOrderIdOrderByIdAsc(o.getId()).stream()
            .map(h -> new HistoryEntry(h.getFromStatus(), h.getToStatus(), h.getCreatedAt(), h.getNote())).toList();
        return new OrderResponse(o.getId(), o.getOrderNumber(), o.getUserId(), o.getOrderStatus(), o.getPaymentStatus(), o.getSubtotal(), o.getDiscountTotal(),
            o.getTaxTotal(), o.getShippingFee(), o.getTotal(), o.getShippingAddress(), o.getCreatedAt(), o.getExpiresAt(), items, hist);
    }

    private String snapshot(Address a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fullName", a.getFullName()); m.put("phone", a.getPhone()); m.put("line1", a.getLine1()); m.put("line2", a.getLine2());
        m.put("city", a.getCity()); m.put("state", a.getState()); m.put("postalCode", a.getPostalCode()); m.put("country", a.getCountry());
        try { return mapper.writeValueAsString(m); } catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    private String newOrderNumber() {
        StringBuilder sb = new StringBuilder("ORD-").append(DateTimeFormatter.BASIC_ISO_DATE.format(java.time.LocalDate.now(ZoneOffset.UTC))).append('-');
        for (int i = 0; i < 8; i++) sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        return sb.toString();
    }
}
