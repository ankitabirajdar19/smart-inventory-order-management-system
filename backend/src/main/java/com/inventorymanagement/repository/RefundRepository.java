package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Refund;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    @Query("select coalesce(sum(r.amount), 0) from Refund r where r.paymentId = :pid")
    BigDecimal sumByPaymentId(@Param("pid") Long paymentId);
}
