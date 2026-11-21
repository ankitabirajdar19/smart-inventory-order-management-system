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
@Table(name = "warehouses")
@Getter @Setter @NoArgsConstructor
public class Warehouse extends BaseEntity {
    private String name;
    private String code;
    private String location;
    private String address;
    private String contactNumber;
    private Long managerId;
    private boolean active = true;
}
