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
@Table(name = "product_images")
@Getter @Setter @NoArgsConstructor
public class ProductImage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id") private Product product;
    private String storageKey;
    private String contentType;
    private int sortOrder;
    private boolean primaryImage;
}
