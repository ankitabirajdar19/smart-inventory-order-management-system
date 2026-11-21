package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import com.inventorymanagement.enums.*;
import java.math.BigDecimal;
import java.time.Instant;

public final class PaymentDtos {
    private PaymentDtos() {}
    /** simulate is honoured only when app.payment.allow-simulation=true (dev profile). */
    public record PayRequest(@NotNull Long orderId, @NotNull PaymentMethod method, SimulatedOutcome simulate) {}
    public record RefundRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount, @NotBlank @Size(max = 255) String reason) {}
    public record PaymentResponse(Long id, Long orderId, PaymentMethod method, PaymentStatus status, BigDecimal amount,
        String transactionReference, String failureReason, Instant createdAt) {}
}
