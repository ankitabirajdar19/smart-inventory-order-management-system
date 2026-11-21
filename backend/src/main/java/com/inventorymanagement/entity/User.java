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
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User extends BaseEntity {
    private String email;
    private String passwordHash;
    private String fullName;
    private String phone;
    @Enumerated(EnumType.STRING) private UserStatus status = UserStatus.ACTIVE;
    private boolean emailVerified;
    private int failedLoginCount;
    private Instant lockedUntil;
    private Instant deletedAt;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();
}
