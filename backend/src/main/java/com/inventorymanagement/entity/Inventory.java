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
@Table(name = "inventory")
@Getter @Setter @NoArgsConstructor
public class Inventory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id") private Product product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "warehouse_id") private Warehouse warehouse;
    private int availableQuantity;
    private int reservedQuantity;
    private int reorderLevel = 10;
    /** Safety net on top of the pessimistic row lock. */
    @Version private Long version;
}
