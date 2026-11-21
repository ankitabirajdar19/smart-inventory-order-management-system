package com.inventorymanagement.service;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.PaymentDtos.*;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.enums.*;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.payment.PaymentGateway;
import com.inventorymanagement.payment.PaymentGateway.ChargeRequest;
import com.inventorymanagement.payment.PaymentGateway.ChargeResult;
import com.inventorymanagement.repository.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Payment orchestration. The external gateway call is NEVER made inside a database transaction:
 *   TX-A  initiate : validate order, create Payment(INITIATED)            -> commit
 *   call  gateway  : charge (idempotent on transactionReference)
 *   TX-B  settle   : lock order+payment, apply the outcome                -> commit
 * settle() is idempotent, so a duplicate webhook/callback is a no-op. If the order stopped being payable while
 * the charge was in flight (expired/cancelled), a successful charge is compensated with an automatic refund.
 * Lock order everywhere is: order row first, then payment row (prevents deadlocks).
 */
@Slf4j
@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final RefundRepository refunds;
    private final SalesOrderRepository orders;
    private final InventoryService inventory;
    private final OrderHistoryRecorder history;
    private final PaymentGateway gateway;
    private final AppProperties props;
    private final AuditService audit;
    private final TransactionTemplate tx;

    public PaymentService(PaymentRepository payments, RefundRepository refunds, SalesOrderRepository orders, InventoryService inventory,
                          OrderHistoryRecorder history, PaymentGateway gateway, AppProperties props, AuditService audit, PlatformTransactionManager tm) {
        this.payments = payments; this.refunds = refunds; this.orders = orders; this.inventory = inventory; this.history = history;
        this.gateway = gateway; this.props = props; this.audit = audit; this.tx = new TransactionTemplate(tm);
    }

    public PaymentResponse pay(Long userId, PayRequest req, String idemKey) {
        Payment p = tx.execute(s -> initiate(userId, req, idemKey));
        if (p.getStatus() != PaymentStatus.INITIATED) return toResponse(p);   // replay, COD, or already settled
        SimulatedOutcome sim = props.payment().allowSimulation() ? req.simulate() : null;
        ChargeResult result;
        try {
            result = gateway.charge(new ChargeRequest(p.getTransactionReference(), p.getAmount(), p.getMethod(), sim));
        } catch (RuntimeException e) {
            // Outcome unknown (timeout etc.): leave INITIATED; the client can re-send the same key or poll GET /payments/{id}.
            log.error("Gateway call failed for {}", p.getTransactionReference(), e);
            return toResponse(p);
        }
        return toResponse(settle(p.getTransactionReference(), result));
    }

    /** New attempt for the same order after a failure (new idempotency key). */
    public PaymentResponse retry(Long userId, Long paymentId, String idemKey, SimulatedOutcome simulate) {
        Payment old = payments.findById(paymentId).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        orders.findById(old.getOrderId()).filter(o -> o.getUserId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (old.getStatus() != PaymentStatus.FAILED) throw new BusinessRuleViolationException("Only failed payments can be retried");
        return pay(userId, new PayRequest(old.getOrderId(), old.getMethod(), simulate), idemKey);
    }

    /** Idempotent entry point shared by the synchronous flow and (future) verified gateway webhooks. */
    public Payment settle(String transactionReference, ChargeResult result) {
        return tx.execute(s -> {
            Payment peek = payments.findByTransactionReference(transactionReference).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
            SalesOrder o = orders.findByIdForUpdate(peek.getOrderId()).orElseThrow();      // order first ...
            Payment p = payments.findByIdForUpdate(peek.getId()).orElseThrow();            // ... then payment
            if (p.getStatus() != PaymentStatus.INITIATED) return p;                          // duplicate callback: no-op
            p.setGatewayReference(result.gatewayReference());
            if (result.success()) {
                p.setStatus(PaymentStatus.SUCCESS);
                if (o.getOrderStatus() == OrderStatus.PENDING) {
                    o.setPaymentStatus(PaymentStatus.SUCCESS);
                    confirm(o, null);
                } else {
                    log.warn("Charge succeeded for order {} in status {}; auto-refunding", o.getOrderNumber(), o.getOrderStatus());
                    createRefund(p, o, p.getAmount(), "Auto-refund: order no longer payable", null);
                }
            } else {
                p.setStatus(PaymentStatus.FAILED);
                p.setFailureReason(result.failureReason());
                if (o.getOrderStatus() == OrderStatus.PENDING) o.setPaymentStatus(PaymentStatus.FAILED);   // stock stays reserved until expiry
            }
            return p;
        });
    }

    @Transactional
    public PaymentResponse refund(Long paymentId, RefundRequest r, Long adminId) {
        Payment peek = payments.findById(paymentId).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        SalesOrder o = orders.findByIdForUpdate(peek.getOrderId()).orElseThrow();
        Payment p = payments.findByIdForUpdate(paymentId).orElseThrow();
        if (p.getStatus() != PaymentStatus.SUCCESS && p.getStatus() != PaymentStatus.PARTIALLY_REFUNDED)
            throw new BusinessRuleViolationException("Only successful payments can be refunded");
        BigDecimal remaining = p.getAmount().subtract(refunds.sumByPaymentId(p.getId()));
        if (r.amount().compareTo(remaining) > 0) throw new BusinessRuleViolationException("Refund exceeds the refundable amount (" + remaining + ")");
        createRefund(p, o, r.amount(), r.reason(), adminId);
        audit.record(adminId, "PAYMENT_REFUNDED", "PAYMENT", p.getId(), null, r);
        return toResponse(p);
    }

    /** Called inside OrderService.cancel's transaction (order row is already locked). */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void refundOnCancellation(SalesOrder o, Long actorId) {
        payments.findFirstByOrderIdAndStatusIn(o.getId(), List.of(PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PENDING)).ifPresent(p0 -> {
            Payment p = payments.findByIdForUpdate(p0.getId()).orElseThrow();
            if (p.getStatus() == PaymentStatus.PENDING) {   // COD never collected
                p.setStatus(PaymentStatus.FAILED);
                p.setFailureReason("Order cancelled before collection");
                return;
            }
            BigDecimal remaining = p.getAmount().subtract(refunds.sumByPaymentId(p.getId()));
            if (remaining.signum() > 0) createRefund(p, o, remaining, "Order cancelled", actorId);
        });
    }

    @Transactional(readOnly = true)
    public PaymentResponse get(Long userId, boolean admin, Long id) {
        Payment p = payments.findById(id).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (!admin) orders.findById(p.getOrderId()).filter(o -> o.getUserId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        return toResponse(p);
    }

    // ---------- internals ----------
    private Payment initiate(Long userId, PayRequest req, String idemKey) {
        var existing = payments.findByIdempotencyKey(idemKey);
        if (existing.isPresent()) {
            Payment e = existing.get();
            orders.findById(e.getOrderId()).filter(o -> o.getUserId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            if (!e.getOrderId().equals(req.orderId())) throw new BusinessRuleViolationException("Idempotency-Key was already used for a different order");
            return e;
        }
        SalesOrder o = orders.findByIdForUpdate(req.orderId()).filter(x -> x.getUserId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (o.getOrderStatus() != OrderStatus.PENDING) throw new BusinessRuleViolationException("Order is not awaiting payment");
        if (o.getExpiresAt() != null && o.getExpiresAt().isBefore(Instant.now())) throw new BusinessRuleViolationException("The stock reservation for this order has expired");
        if (payments.existsByOrderIdAndStatusIn(o.getId(), List.of(PaymentStatus.INITIATED, PaymentStatus.SUCCESS)))
            throw new BusinessRuleViolationException("A payment is already in progress or completed for this order");
        Payment p = new Payment();
        p.setOrderId(o.getId());
        p.setMethod(req.method());
        p.setAmount(o.getTotal());
        p.setTransactionReference("TXN-" + UUID.randomUUID());
        p.setIdempotencyKey(idemKey);
        if (req.method() == PaymentMethod.COD) {   // cash on delivery: no gateway; confirm now, collect at delivery
            p.setStatus(PaymentStatus.PENDING);
            o.setPaymentStatus(PaymentStatus.PENDING);
            confirm(o, null);
        } else p.setStatus(PaymentStatus.INITIATED);
        return payments.saveAndFlush(p);
    }

    private void confirm(SalesOrder o, Long actor) {
        o.setOrderStatus(OrderStatus.CONFIRMED);
        history.record(o.getId(), OrderStatus.PENDING, OrderStatus.CONFIRMED, actor, "Payment accepted");
        for (OrderItem it : o.getItems()) inventory.commitReservation(it.getProductId(), it.getWarehouseId(), it.getQuantity(), o.getId(), actor);
    }

    private void createRefund(Payment p, SalesOrder o, BigDecimal amount, String reason, Long actor) {
        ChargeResult res = gateway.refund(p.getGatewayReference(), amount);   // mock; a real gateway call would use an idempotency key
        if (!res.success()) throw new PaymentFailedException("Gateway refused the refund: " + res.failureReason());
        Refund r = new Refund();
        r.setPaymentId(p.getId()); r.setAmount(amount); r.setReason(reason); r.setCreatedBy(actor);
        refunds.save(r);
        boolean full = refunds.sumByPaymentId(p.getId()).compareTo(p.getAmount()) >= 0;
        p.setStatus(full ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
        o.setPaymentStatus(p.getStatus());
    }

    private PaymentResponse toResponse(Payment p) {
        return new PaymentResponse(p.getId(), p.getOrderId(), p.getMethod(), p.getStatus(), p.getAmount(), p.getTransactionReference(), p.getFailureReason(), p.getCreatedAt());
    }
}
