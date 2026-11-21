package com.inventorymanagement.repository;

import com.inventorymanagement.entity.IdempotencyRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, Long> {
    Optional<IdempotencyRecord> findByUserIdAndScopeAndIdemKey(Long userId, String scope, String idemKey);
}
