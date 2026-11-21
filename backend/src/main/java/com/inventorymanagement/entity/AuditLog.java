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
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor
public class AuditLog extends IdEntity {
    private Long userId;
    private String action;
    private String module;
    private String entityId;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private Instant createdAt = Instant.now();
}
