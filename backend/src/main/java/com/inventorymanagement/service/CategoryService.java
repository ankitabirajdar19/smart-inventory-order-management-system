package com.inventorymanagement.service;

import com.inventorymanagement.dto.CatalogDtos.*;
import com.inventorymanagement.entity.Category;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categories;
    private final ProductRepository products;

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(boolean includeInactive) {
        return (includeInactive ? categories.findAllByOrderByNameAsc() : categories.findByActiveTrueOrderByNameAsc()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest r) {
        Category c = new Category();
        apply(c, r, null);
        return toResponse(categories.save(c));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest r) {
        Category c = categories.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        apply(c, r, id);
        return toResponse(c);
    }

    /** Blocked while products or child categories still reference it (reassign them first). */
    @Transactional
    public void delete(Long id) {
        Category c = categories.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (products.countByCategoryIdAndDeletedAtIsNull(id) > 0)
            throw new BusinessRuleViolationException("Category still contains products; reassign them first");
        if (categories.existsByParentId(id)) throw new BusinessRuleViolationException("Category has child categories");
        categories.delete(c);
    }

    private void apply(Category c, CategoryRequest r, Long selfId) {
        String slug = slugify(r.name());
        boolean taken = selfId == null ? categories.existsBySlug(slug) : categories.existsBySlugAndIdNot(slug, selfId);
        if (taken) throw new DuplicateResourceException("A category with this name already exists");
        c.setName(r.name().trim());
        c.setSlug(slug);
        c.setDescription(r.description());
        c.setImageUrl(r.imageUrl());
        c.setActive(r.active() == null || r.active());
        if (r.parentId() != null) {
            if (r.parentId().equals(selfId)) throw new BusinessRuleViolationException("A category cannot be its own parent");
            c.setParent(categories.findById(r.parentId()).orElseThrow(() -> new ResourceNotFoundException("Parent category not found")));
        } else c.setParent(null);
    }

    static String slugify(String s) {
        String n = Normalizer.normalize(s.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private CategoryResponse toResponse(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getParent() == null ? null : c.getParent().getId(), c.isActive());
    }
}
