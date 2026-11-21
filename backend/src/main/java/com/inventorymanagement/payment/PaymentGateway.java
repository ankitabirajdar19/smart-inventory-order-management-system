package com.inventorymanagement.payment;

import com.inventorymanagement.enums.PaymentMethod;
import com.inventorymanagement.enums.SimulatedOutcome;
import java.math.BigDecimal;

/**
 * Strategy interface for payment providers. MockPaymentGateway is the local implementation; a real provider
 * (Razorpay, Stripe, ...) implements the same contract and reports results through PaymentService.settle(),
 * which is idempotent, so verified webhooks can safely be delivered more than once.
 */
public interface PaymentGateway {
    record ChargeRequest(String transactionReference, BigDecimal amount, PaymentMethod method, SimulatedOutcome simulate) {}
    record ChargeResult(boolean success, String gatewayReference, String failureReason) {}

    /** Must be idempotent on transactionReference. Never receives raw card data. */
    ChargeResult charge(ChargeRequest request);

    ChargeResult refund(String gatewayReference, BigDecimal amount);
}
