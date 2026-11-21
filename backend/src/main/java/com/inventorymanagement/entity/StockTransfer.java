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
@Table(name = "stock_transfers")
@Getter @Setter @NoArgsConstructor
public class StockTransfer extends IdEntity {
    private Long productId;
    private Long sourceWarehouseId;
    private Long destinationWarehouseId;
    private int quantity;
    private String reason;
    private Long performedBy;
    private Instant createdAt = Instant.now();
}
