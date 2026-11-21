package com.inventorymanagement.repository;

import com.inventorymanagement.entity.SalesOrder;
import com.inventorymanagement.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long>, JpaSpecificationExecutor<SalesOrder> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from SalesOrder o where o.id = :id")
    Optional<SalesOrder> findByIdForUpdate(@Param("id") Long id);

    @Query("select o from SalesOrder o left join fetch o.items where o.id = :id")
    Optional<SalesOrder> findDetailById(@Param("id") Long id);

    Page<SalesOrder> findByUserId(Long userId, Pageable pageable);
    List<SalesOrder> findTop100ByOrderStatusAndExpiresAtBefore(OrderStatus status, Instant cutoff);
}
