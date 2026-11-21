package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Inventory;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    /** Locks every stock row of a product in ascending id order (consistent order => no deadlocks). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.product.id = :pid order by i.id")
    List<Inventory> lockAllByProduct(@Param("pid") Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.product.id = :pid and i.warehouse.id in :wids order by i.id")
    List<Inventory> lockByProductAndWarehouses(@Param("pid") Long productId, @Param("wids") Collection<Long> warehouseIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.product.id = :pid and i.warehouse.id = :wid")
    Optional<Inventory> lockByProductAndWarehouse(@Param("pid") Long productId, @Param("wid") Long warehouseId);

    boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId);

    @Query("select coalesce(max(i.availableQuantity), 0) from Inventory i where i.product.id = :pid")
    int maxAvailable(@Param("pid") Long productId);

    @Query("select i.product.id, coalesce(max(i.availableQuantity), 0) from Inventory i where i.product.id in :ids group by i.product.id")
    List<Object[]> maxAvailableByProducts(@Param("ids") Collection<Long> ids);

    @Query("select i.product.id, coalesce(sum(i.availableQuantity), 0) from Inventory i where i.product.id in :ids group by i.product.id")
    List<Object[]> totalAvailableByProducts(@Param("ids") Collection<Long> ids);

    @Override
    @EntityGraph(attributePaths = {"product", "warehouse"})
    Page<Inventory> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"product", "warehouse"})
    Page<Inventory> findByWarehouseId(Long warehouseId, Pageable pageable);

    @EntityGraph(attributePaths = {"product", "warehouse"})
    @Query(value = "select i from Inventory i where i.availableQuantity <= i.reorderLevel",
           countQuery = "select count(i) from Inventory i where i.availableQuantity <= i.reorderLevel")
    Page<Inventory> findLowStock(Pageable pageable);
}
