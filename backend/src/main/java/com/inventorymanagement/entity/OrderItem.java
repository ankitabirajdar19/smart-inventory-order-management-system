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
@Table(name = "order_items")
@Getter @Setter @NoArgsConstructor
public class OrderItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id") private SalesOrder order;
    private Long productId;
    private Long warehouseId;
    private String productName;
    private String sku;
    private BigDecimal listPrice;
    private BigDecimal unitPrice;
    private BigDecimal taxRate;
    private int quantity;
    private BigDecimal lineTotal;
}
