package com.inventorymanagement.service;

import com.inventorymanagement.dto.InventoryDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.enums.MovementType;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single place where stock changes. Every mutation:
 *  1. takes a PESSIMISTIC_WRITE lock on the inventory row(s) (SELECT ... FOR UPDATE, ascending id order),
 *  2. re-checks business rules on the locked row,
 *  3. writes an InventoryMovement in the same transaction.
 * Reserve/commit/release are idempotent per (reference, movement type, product, warehouse).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {
    public static final String REF_ORDER = "ORDER";
    public static final String REF_ORDER_CANCEL = "ORDER_CANCEL";
    public static final String REF_TRANSFER = "TRANSFER";

    private final InventoryRepository inventory;
    private final InventoryMovementRepository movements;
    private final ProductRepository products;
    private final WarehouseRepository warehouses;
    private final StockTransferRepository transfers;
    private final AuditService audit;

    /** Moves qty from available to reserved in ONE warehouse that can fulfil the whole line; returns the warehouse id. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Long reserve(Long productId, int qty, Long orderId, Long userId) {
        requirePositive(qty);
        List<Inventory> rows = inventory.lockAllByProduct(productId);
        Inventory chosen = rows.stream().filter(i -> i.getAvailableQuantity() >= qty)
            .max(Comparator.comparingInt(Inventory::getAvailableQuantity))
            .orElseThrow(() -> new InsufficientStockException(productId, qty, rows.stream().mapToInt(Inventory::getAvailableQuantity).max().orElse(0)));
        move(chosen, MovementType.RESERVATION, qty, -qty, qty, REF_ORDER, orderId, "Stock reserved for order", userId);
        return chosen.getWarehouse().getId();
    }

    /** Payment confirmed: the reserved units leave the building (SALE_OUT). Idempotent. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void commitReservation(Long productId, Long warehouseId, int qty, Long orderId, Long userId) {
        if (applied(MovementType.SALE_OUT, REF_ORDER, orderId, productId, warehouseId)) return;
        Inventory i = lock(productId, warehouseId);
        move(i, MovementType.SALE_OUT, qty, 0, -qty, REF_ORDER, orderId, "Order confirmed", userId);
    }

    /** Order cancelled/expired before payment: reserved units return to available. Idempotent. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseReservation(Long productId, Long warehouseId, int qty, Long orderId, Long userId, String reason) {
        if (applied(MovementType.RESERVATION_RELEASE, REF_ORDER, orderId, productId, warehouseId)) return;
        Inventory i = lock(productId, warehouseId);
        move(i, MovementType.RESERVATION_RELEASE, qty, qty, -qty, REF_ORDER, orderId, reason, userId);
    }

    /** Order cancelled after confirmation (stock already sold out): put the units back. Idempotent. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void restockCancelled(Long productId, Long warehouseId, int qty, Long orderId, Long userId) {
        if (applied(MovementType.RETURN_IN, REF_ORDER_CANCEL, orderId, productId, warehouseId)) return;
        Inventory i = lock(productId, warehouseId);
        move(i, MovementType.RETURN_IN, qty, qty, 0, REF_ORDER_CANCEL, orderId, "Order cancelled after confirmation", userId);
    }

    @Transactional
    public InventoryResponse adjust(AdjustmentRequest r, Long userId) {
        if (r.delta() == 0) throw new BusinessRuleViolationException("Adjustment must be non-zero");
        Inventory i = lockOrCreate(r.productId(), r.warehouseId());
        int prev = i.getAvailableQuantity();
        MovementType type = r.delta() > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;
        move(i, type, Math.abs(r.delta()), r.delta(), 0, "ADJUSTMENT", null, r.reason(), userId);
        audit.record(userId, "STOCK_ADJUSTED", "INVENTORY", i.getId(), Map.of("available", prev), Map.of("available", i.getAvailableQuantity(), "reason", r.reason()));
        return toResponse(i);
    }

    /** One transaction, both rows locked together in ascending id order, so A->B and B->A cannot deadlock. */
    @Transactional
    public void transfer(TransferRequest r, Long userId) {
        if (r.sourceWarehouseId().equals(r.destinationWarehouseId())) throw new BusinessRuleViolationException("Source and destination must differ");
        ensureRow(r.productId(), r.sourceWarehouseId());
        ensureRow(r.productId(), r.destinationWarehouseId());
        List<Inventory> locked = inventory.lockByProductAndWarehouses(r.productId(), List.of(r.sourceWarehouseId(), r.destinationWarehouseId()));
        Inventory src = locked.stream().filter(x -> x.getWarehouse().getId().equals(r.sourceWarehouseId())).findFirst().orElseThrow();
        Inventory dst = locked.stream().filter(x -> x.getWarehouse().getId().equals(r.destinationWarehouseId())).findFirst().orElseThrow();
        if (src.getAvailableQuantity() < r.quantity()) throw new InsufficientStockException(r.productId(), r.quantity(), src.getAvailableQuantity());
        StockTransfer t = new StockTransfer();
        t.setProductId(r.productId());
        t.setSourceWarehouseId(r.sourceWarehouseId());
        t.setDestinationWarehouseId(r.destinationWarehouseId());
        t.setQuantity(r.quantity());
        t.setReason(r.reason());
        t.setPerformedBy(userId);
        t = transfers.save(t);
        move(src, MovementType.TRANSFER_OUT, r.quantity(), -r.quantity(), 0, REF_TRANSFER, t.getId(), r.reason(), userId);
        move(dst, MovementType.TRANSFER_IN, r.quantity(), r.quantity(), 0, REF_TRANSFER, t.getId(), r.reason(), userId);
        audit.record(userId, "STOCK_TRANSFERRED", "INVENTORY", t.getId(), null, r);
    }

    @Transactional(readOnly = true)
    public PageResponse<InventoryResponse> list(Long warehouseId, Pageable p) {
        var page = warehouseId == null ? inventory.findAll(p) : inventory.findByWarehouseId(warehouseId, p);
        return PageResponse.of(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<InventoryResponse> lowStock(Pageable p) { return PageResponse.of(inventory.findLowStock(p).map(this::toResponse)); }

    @Transactional(readOnly = true)
    public PageResponse<MovementResponse> movements(Long productId, Pageable p) {
        var page = productId == null ? movements.findAll(p) : movements.findByProductId(productId, p);
        return PageResponse.of(page.map(m -> new MovementResponse(m.getId(), m.getProductId(), m.getWarehouseId(), m.getMovementType(), m.getQuantity(),
            m.getPreviousQuantity(), m.getNewQuantity(), m.getPreviousReserved(), m.getNewReserved(), m.getReferenceType(), m.getReferenceId(),
            m.getReason(), m.getPerformedBy(), m.getCreatedAt())));
    }

    // ---------- internals ----------
    private void move(Inventory inv, MovementType type, int qty, int availDelta, int reservedDelta, String refType, Long refId, String reason, Long userId) {
        int prevA = inv.getAvailableQuantity(), prevR = inv.getReservedQuantity();
        int newA = prevA + availDelta, newR = prevR + reservedDelta;
        if (newA < 0 || newR < 0) throw new BusinessRuleViolationException("Inventory cannot become negative");
        inv.setAvailableQuantity(newA);
        inv.setReservedQuantity(newR);
        InventoryMovement m = new InventoryMovement();
        m.setProductId(inv.getProduct().getId());
        m.setWarehouseId(inv.getWarehouse().getId());
        m.setMovementType(type);
        m.setQuantity(qty);
        m.setPreviousQuantity(prevA);
        m.setNewQuantity(newA);
        m.setPreviousReserved(prevR);
        m.setNewReserved(newR);
        m.setReferenceType(refType);
        m.setReferenceId(refId);
        m.setReason(reason);
        m.setPerformedBy(userId);
        movements.save(m);
        inventory.save(inv);
    }

    private boolean applied(MovementType t, String refType, Long refId, Long productId, Long warehouseId) {
        return movements.existsByReferenceTypeAndReferenceIdAndMovementTypeAndProductIdAndWarehouseId(refType, refId, t, productId, warehouseId);
    }

    private Inventory lock(Long productId, Long warehouseId) {
        return inventory.lockByProductAndWarehouse(productId, warehouseId)
            .orElseThrow(() -> new ResourceNotFoundException("Inventory record not found"));
    }

    private Inventory lockOrCreate(Long productId, Long warehouseId) {
        ensureRow(productId, warehouseId);
        return lock(productId, warehouseId);
    }

    private void ensureRow(Long productId, Long warehouseId) {
        if (inventory.existsByProductIdAndWarehouseId(productId, warehouseId)) return;
        Product p = products.findByIdAndDeletedAtIsNull(productId).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        Warehouse w = warehouses.findById(warehouseId).orElseThrow(() -> new ResourceNotFoundException("Warehouse not found"));
        Inventory n = new Inventory();
        n.setProduct(p);
        n.setWarehouse(w);
        try { inventory.saveAndFlush(n); }
        catch (DataIntegrityViolationException e) { throw new DuplicateResourceException("Inventory record was created concurrently, retry"); }
    }

    private static void requirePositive(int qty) { if (qty <= 0) throw new BusinessRuleViolationException("Quantity must be positive"); }

    private InventoryResponse toResponse(Inventory i) {
        return new InventoryResponse(i.getId(), i.getProduct().getId(), i.getProduct().getSku(), i.getProduct().getName(), i.getWarehouse().getId(),
            i.getWarehouse().getName(), i.getAvailableQuantity(), i.getReservedQuantity(), i.getReorderLevel(), i.getAvailableQuantity() <= i.getReorderLevel());
    }
}
