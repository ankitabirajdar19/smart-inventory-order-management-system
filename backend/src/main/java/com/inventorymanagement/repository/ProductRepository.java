package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Product;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndDeletedAtIsNull(Long id);
    boolean existsBySkuAndDeletedAtIsNull(String sku);
    boolean existsBySkuAndDeletedAtIsNullAndIdNot(String sku, Long id);
    long countByCategoryIdAndDeletedAtIsNull(Long categoryId);

    @Override
    @EntityGraph(attributePaths = "category")
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);
}
