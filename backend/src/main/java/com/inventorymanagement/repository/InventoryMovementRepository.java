package com.inventorymanagement.repository;

import com.inventorymanagement.entity.InventoryMovement;
import com.inventorymanagement.enums.MovementType;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {
    boolean existsByReferenceTypeAndReferenceIdAndMovementTypeAndProductIdAndWarehouseId(
        String referenceType, Long referenceId, MovementType type, Long productId, Long warehouseId);
    Page<InventoryMovement> findByProductId(Long productId, Pageable pageable);
    List<InventoryMovement> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}
