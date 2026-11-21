package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class CatalogDtos {
    private CatalogDtos() {}
    public record CategoryRequest(@NotBlank @Size(max = 120) String name, String description, Long parentId,
                                  @Size(max = 500) String imageUrl, Boolean active) {}
    public record CategoryResponse(Long id, String name, String slug, String description, Long parentId, boolean active) {}

    public record ProductRequest(
        @NotBlank @Size(max = 64) String sku,
        @NotBlank @Size(max = 200) String name,
        String description, @Size(max = 100) String brand,
        @NotNull Long categoryId,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal discountPrice,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal taxRate,
        @DecimalMin("0.000") BigDecimal weightKg, @Size(max = 60) String dimensions, @Size(max = 40) String barcode,
        @Min(0) Integer minStockLevel, @Min(0) Integer maxStockLevel, Boolean active) {}
    public record ProductResponse(Long id, String sku, String name, String description, String brand,
        Long categoryId, String categoryName, BigDecimal price, BigDecimal discountPrice, BigDecimal effectivePrice,
        BigDecimal taxRate, BigDecimal weightKg, String dimensions, String barcode, Integer minStockLevel,
        Integer maxStockLevel, boolean active, int availableQuantity, boolean inStock, List<String> imageUrls, Instant createdAt) {}
    public record ProductFilter(String q, Long categoryId, String brand, BigDecimal minPrice, BigDecimal maxPrice, Boolean inStock) {}
    public record ImportResult(int created, int skipped, List<String> errors) {}
}
