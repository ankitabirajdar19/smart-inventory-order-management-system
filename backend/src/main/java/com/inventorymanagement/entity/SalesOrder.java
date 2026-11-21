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
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor
public class SalesOrder extends BaseEntity {
    private String orderNumber;
    private Long userId;
    private String shippingAddress;
    private String billingAddress;
    private BigDecimal subtotal;
    private BigDecimal discountTotal;
    private BigDecimal taxTotal;
    private BigDecimal shippingFee;
    private BigDecimal total;
    @Enumerated(EnumType.STRING) private OrderStatus orderStatus;
    @Enumerated(EnumType.STRING) private PaymentStatus paymentStatus;
    private Instant expiresAt;
    @Version private Long version;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
}
