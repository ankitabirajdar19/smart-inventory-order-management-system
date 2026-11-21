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
@Table(name = "inventory_movements")
@Getter @Setter @NoArgsConstructor
public class InventoryMovement extends IdEntity {
    private Long productId;
    private Long warehouseId;
    @Enumerated(EnumType.STRING) private MovementType movementType;
    private int quantity;
    private int previousQuantity;
    private int newQuantity;
    private int previousReserved;
    private int newReserved;
    private String referenceType;
    private Long referenceId;
    private String reason;
    private Long performedBy;
    private Instant createdAt = Instant.now();
}
