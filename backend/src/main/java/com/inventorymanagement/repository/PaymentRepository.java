package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Payment;
import com.inventorymanagement.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByIdempotencyKey(String key);
    Optional<Payment> findByTransactionReference(String reference);
    List<Payment> findByOrderIdOrderByIdDesc(Long orderId);
    boolean existsByOrderIdAndStatusIn(Long orderId, Collection<PaymentStatus> statuses);
    Optional<Payment> findFirstByOrderIdAndStatusIn(Long orderId, Collection<PaymentStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);
}
