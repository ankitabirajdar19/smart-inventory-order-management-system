package com.inventorymanagement.util;

import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageUtil {
    private PageUtil() {}
    /** Builds a Pageable; only whitelisted sort fields are honoured (prevents arbitrary property sorting). */
    public static Pageable of(int page, int size, String sortBy, String direction, Set<String> allowed, String defaultSort) {
        String field = allowed.contains(sortBy) ? sortBy : defaultSort;
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(dir, field).and(Sort.by(Sort.Direction.DESC, "id")));
    }
}
