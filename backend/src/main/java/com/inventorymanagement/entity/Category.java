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
@Table(name = "categories")
@Getter @Setter @NoArgsConstructor
public class Category extends BaseEntity {
    private String name;
    private String slug;
    private String description;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "parent_id") private Category parent;
    private String imageUrl;
    private boolean active = true;
}
