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
@Table(name = "idempotency_records")
@Getter @Setter @NoArgsConstructor
public class IdempotencyRecord extends IdEntity {
    private Long userId;
    private String scope;
    private String idemKey;
    private String requestHash;
    private Long resourceId;
    private Instant createdAt = Instant.now();
}
