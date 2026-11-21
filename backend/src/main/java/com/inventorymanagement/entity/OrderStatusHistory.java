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
@Table(name = "order_status_history")
@Getter @Setter @NoArgsConstructor
public class OrderStatusHistory extends IdEntity {
    private Long orderId;
    @Enumerated(EnumType.STRING) private OrderStatus fromStatus;
    @Enumerated(EnumType.STRING) private OrderStatus toStatus;
    private Long changedBy;
    private String note;
    private Instant createdAt = Instant.now();
}
