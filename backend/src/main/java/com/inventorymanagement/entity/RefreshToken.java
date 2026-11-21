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
@Table(name = "refresh_tokens")
@Getter @Setter @NoArgsConstructor
public class RefreshToken extends IdEntity {
    private Long userId;
    private String tokenHash;
    private String familyId;
    private Instant expiresAt;
    private Instant revokedAt;
    private String replacedByHash;
    private Instant createdAt = Instant.now();
}
