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
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor
public class Payment extends BaseEntity {
    private Long orderId;
    @Enumerated(EnumType.STRING) private PaymentMethod method;
    @Enumerated(EnumType.STRING) private PaymentStatus status;
    private BigDecimal amount;
    private String transactionReference;
    private String gatewayReference;
    private String failureReason;
    private String idempotencyKey;
    @Version private Long version;
}
