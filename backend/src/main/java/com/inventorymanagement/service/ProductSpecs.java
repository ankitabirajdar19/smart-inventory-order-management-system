package com.inventorymanagement.service;

import com.inventorymanagement.dto.CatalogDtos.ProductFilter;
import com.inventorymanagement.entity.Inventory;
import com.inventorymanagement.entity.Product;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecs {
    private ProductSpecs() {}

    public static Specification<Product> of(ProductFilter f, boolean includeInactive) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isNull(root.get("deletedAt")));
            if (!includeInactive) p.add(cb.isTrue(root.get("active")));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + f.q().trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like, '\\'), cb.like(cb.lower(root.get("sku")), like, '\\')));
            }
            if (f.categoryId() != null) p.add(cb.equal(root.get("category").get("id"), f.categoryId()));
            if (f.brand() != null && !f.brand().isBlank()) p.add(cb.equal(cb.lower(root.get("brand")), f.brand().trim().toLowerCase()));
            if (f.minPrice() != null) p.add(cb.greaterThanOrEqualTo(root.get("price"), f.minPrice()));
            if (f.maxPrice() != null) p.add(cb.lessThanOrEqualTo(root.get("price"), f.maxPrice()));
            if (Boolean.TRUE.equals(f.inStock())) {
                Subquery<Long> sq = query.subquery(Long.class);
                Root<Inventory> i = sq.from(Inventory.class);
                sq.select(i.get("id")).where(cb.equal(i.get("product"), root), cb.greaterThan(i.get("availableQuantity"), 0));
                p.add(cb.exists(sq));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
