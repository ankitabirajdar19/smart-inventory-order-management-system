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
@Table(name = "refunds")
@Getter @Setter @NoArgsConstructor
public class Refund extends IdEntity {
    private Long paymentId;
    private BigDecimal amount;
    private String reason;
    private String status = "COMPLETED";
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
