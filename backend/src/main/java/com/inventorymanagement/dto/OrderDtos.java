package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import com.inventorymanagement.enums.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {
    private OrderDtos() {}
    public record PlaceOrderRequest(@NotNull Long addressId) {}
    public record StatusUpdateRequest(@NotNull OrderStatus status, @Size(max = 255) String note) {}
    public record CancelRequest(@Size(max = 255) String reason) {}
    public record OrderItemResponse(Long id, Long productId, String productName, String sku, BigDecimal unitPrice, BigDecimal taxRate, int quantity, BigDecimal lineTotal) {}
    public record HistoryEntry(OrderStatus from, OrderStatus to, Instant at, String note) {}
    public record OrderResponse(Long id, String orderNumber, Long customerId, OrderStatus status, PaymentStatus paymentStatus,
        BigDecimal subtotal, BigDecimal discount, BigDecimal tax, BigDecimal shipping, BigDecimal total, String shippingAddress,
        Instant createdAt, Instant expiresAt, List<OrderItemResponse> items, List<HistoryEntry> history) {}
    public record OrderSummary(Long id, String orderNumber, Long customerId, OrderStatus status, PaymentStatus paymentStatus, BigDecimal total, Instant createdAt) {}
}
