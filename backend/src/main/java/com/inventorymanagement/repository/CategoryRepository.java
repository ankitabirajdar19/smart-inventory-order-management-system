package com.inventorymanagement.repository;

import com.inventorymanagement.entity.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrueOrderByNameAsc();
    List<Category> findAllByOrderByNameAsc();
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);
    boolean existsByParentId(Long parentId);
    Optional<Category> findByNameIgnoreCase(String name);
}
