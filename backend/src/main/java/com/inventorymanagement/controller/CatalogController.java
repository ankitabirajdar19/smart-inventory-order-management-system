package com.inventorymanagement.controller;

import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.CatalogDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.security.AuthUser;
import com.inventorymanagement.service.CategoryService;
import com.inventorymanagement.service.ProductService;
import com.inventorymanagement.util.PageUtil;
import jakarta.validation.Valid;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CatalogController {
    private static final Set<String> SORTS = Set.of("name", "price", "createdAt");
    private final ProductService products;
    private final CategoryService categories;

    // ----- public -----
    @GetMapping("/products")
    public ApiResponse<PageResponse<ProductResponse>> list(@RequestParam(required = false) String q, @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String brand, @RequestParam(required = false) BigDecimal minPrice, @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy, @RequestParam(defaultValue = "desc") String direction) {
        return ApiResponse.ok(products.search(new ProductFilter(q, categoryId, brand, minPrice, maxPrice, inStock), PageUtil.of(page, size, sortBy, direction, SORTS, "createdAt"), false));
    }

    @GetMapping("/products/{id}")
    public ApiResponse<ProductResponse> get(@PathVariable Long id) { return ApiResponse.ok(products.get(id, false)); }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> categories() { return ApiResponse.ok(categories.list(false)); }

    // ----- admin: products -----
    @GetMapping("/admin/products") @PreAuthorize("hasAuthority('PRODUCT_WRITE') or hasAuthority('INVENTORY_READ')")
    public ApiResponse<PageResponse<ProductResponse>> adminList(@RequestParam(required = false) String q, @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String brand, @RequestParam(required = false) Boolean inStock, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "createdAt") String sortBy, @RequestParam(defaultValue = "desc") String direction) {
        return ApiResponse.ok(products.search(new ProductFilter(q, categoryId, brand, null, null, inStock), PageUtil.of(page, size, sortBy, direction, SORTS, "createdAt"), true));
    }

    @PostMapping("/admin/products") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('PRODUCT_WRITE')")
    public ApiResponse<ProductResponse> create(@Valid @RequestBody ProductRequest r, @AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(products.create(r, u.id())); }

    @PutMapping("/admin/products/{id}") @PreAuthorize("hasAuthority('PRODUCT_WRITE')")
    public ApiResponse<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductRequest r, @AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(products.update(id, r, u.id())); }

    @DeleteMapping("/admin/products/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('PRODUCT_WRITE')")
    public void archive(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) { products.archive(id, u.id()); }

    @PostMapping(value = "/admin/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAuthority('PRODUCT_WRITE')")
    public ApiResponse<List<String>> images(@PathVariable Long id, @RequestParam("files") List<MultipartFile> files) throws IOException { return ApiResponse.ok(products.addImages(id, files)); }

    @PostMapping(value = "/admin/products/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAuthority('PRODUCT_WRITE')")
    public ApiResponse<ImportResult> importCsv(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal AuthUser u) throws IOException { return ApiResponse.ok(products.importCsv(file, u.id())); }

    @GetMapping("/admin/products/export") @PreAuthorize("hasAuthority('PRODUCT_WRITE') or hasAuthority('REPORT_VIEW')")
    public ResponseEntity<byte[]> export() throws IOException {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products.csv\"")
            .contentType(MediaType.parseMediaType("text/csv")).body(products.exportCsv());
    }

    // ----- admin: categories -----
    @GetMapping("/admin/categories") @PreAuthorize("hasAuthority('CATEGORY_WRITE')")
    public ApiResponse<List<CategoryResponse>> adminCategories() { return ApiResponse.ok(categories.list(true)); }

    @PostMapping("/admin/categories") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('CATEGORY_WRITE')")
    public ApiResponse<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest r) { return ApiResponse.ok(categories.create(r)); }

    @PutMapping("/admin/categories/{id}") @PreAuthorize("hasAuthority('CATEGORY_WRITE')")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest r) { return ApiResponse.ok(categories.update(id, r)); }

    @DeleteMapping("/admin/categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('CATEGORY_WRITE')")
    public void deleteCategory(@PathVariable Long id) { categories.delete(id); }
}
