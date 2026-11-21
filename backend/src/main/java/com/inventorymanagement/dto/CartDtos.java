package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public final class CartDtos {
    private CartDtos() {}
    public record AddItemRequest(@NotNull Long productId, @Min(1) @Max(100) int quantity) {}
    public record UpdateQuantityRequest(@Min(1) @Max(100) int quantity) {}
    public record CartItemResponse(Long itemId, Long productId, String name, String sku, BigDecimal listPrice, BigDecimal unitPrice,
        BigDecimal taxRate, int quantity, BigDecimal lineTotal, int availableQuantity) {}
    public record CartTotals(BigDecimal subtotal, BigDecimal discount, BigDecimal tax, BigDecimal shipping, BigDecimal total) {}
    public record CartResponse(List<CartItemResponse> items, CartTotals totals) {}
    public record AddressRequest(@NotBlank @Size(max = 150) String fullName, @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 200) String line1, @Size(max = 200) String line2, @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state, @NotBlank @Size(max = 12) String postalCode, @Size(max = 100) String country,
        @Pattern(regexp = "HOME|WORK|OTHER") String addressType, Boolean makeDefault) {}
    public record AddressResponse(Long id, String fullName, String phone, String line1, String line2, String city, String state,
        String postalCode, String country, String addressType, boolean defaultAddress) {}
}
