package com.inventorymanagement.entity;

import com.inventorymanagement.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor
public class Product extends BaseEntity {
    private String sku;
    private String name;
    private String description;
    private String brand;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "category_id") private Category category;
    private BigDecimal price;
    private BigDecimal discountPrice;
    private BigDecimal taxRate = new BigDecimal("18.00");
    private BigDecimal weightKg;
    private String dimensions;
    private String barcode;
    private Integer minStockLevel = 0;
    private Integer maxStockLevel;
    private boolean active = true;
    private Instant deletedAt;
}
