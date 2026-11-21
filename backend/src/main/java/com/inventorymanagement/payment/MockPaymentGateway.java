package com.inventorymanagement.payment;

import com.inventorymanagement.enums.SimulatedOutcome;
import org.springframework.stereotype.Component;

/** Deterministic local simulation: outcome is chosen by the caller (dev profile only), never random. */
@Component
public class MockPaymentGateway implements PaymentGateway {
    @Override
    public ChargeResult charge(ChargeRequest r) {
        if (r.simulate() == SimulatedOutcome.FAILURE) return new ChargeResult(false, null, "Payment declined by issuer (simulated)");
        return new ChargeResult(true, "MOCK-" + r.transactionReference(), null);
    }

    @Override
    public ChargeResult refund(String gatewayReference, java.math.BigDecimal amount) {
        return new ChargeResult(true, "MOCK-REFUND-" + (gatewayReference == null ? "COD" : gatewayReference), null);
    }
}
