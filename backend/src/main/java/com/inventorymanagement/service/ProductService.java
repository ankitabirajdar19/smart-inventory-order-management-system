package com.inventorymanagement.service;

import com.inventorymanagement.dto.CatalogDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.entity.Category;
import com.inventorymanagement.entity.Product;
import com.inventorymanagement.entity.ProductImage;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import com.inventorymanagement.storage.FileStorage;
import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProductService {
    private static final int MAX_IMPORT_ROWS = 5000;
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final InventoryRepository inventory;
    private final ProductImageRepository images;
    private final FileStorage storage;
    private final AuditService audit;

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(ProductFilter f, Pageable pageable, boolean includeInactive) {
        var page = products.findAll(ProductSpecs.of(f, includeInactive), pageable);
        Map<Long, Integer> stock = totals(page.getContent().stream().map(Product::getId).toList());
        return PageResponse.of(page.map(p -> toResponse(p, stock.getOrDefault(p.getId(), 0), List.of())));
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id, boolean includeInactive) {
        Product p = products.findByIdAndDeletedAtIsNull(id).filter(x -> includeInactive || x.isActive())
            .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        int avail = totals(List.of(id)).getOrDefault(id, 0);
        List<String> urls = images.findByProductIdOrderBySortOrderAsc(id).stream().map(i -> "/files/" + i.getStorageKey()).toList();
        return toResponse(p, avail, urls);
    }

    @Transactional
    public ProductResponse create(ProductRequest r, Long userId) {
        String sku = r.sku().trim().toUpperCase();
        if (products.existsBySkuAndDeletedAtIsNull(sku)) throw new DuplicateResourceException("SKU already exists: " + sku);
        Product p = new Product();
        apply(p, r, sku);
        p = products.save(p);
        audit.record(userId, "PRODUCT_CREATED", "PRODUCT", p.getId(), null, Map.of("sku", sku, "price", p.getPrice()));
        return toResponse(p, 0, List.of());
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest r, Long userId) {
        Product p = products.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        String sku = r.sku().trim().toUpperCase();
        if (products.existsBySkuAndDeletedAtIsNullAndIdNot(sku, id)) throw new DuplicateResourceException("SKU already exists: " + sku);
        BigDecimal oldPrice = p.getPrice(), oldDiscount = p.getDiscountPrice();
        apply(p, r, sku);
        if (oldPrice.compareTo(p.getPrice()) != 0 || !Objects.equals(oldDiscount, p.getDiscountPrice()))
            audit.record(userId, "PRODUCT_PRICE_CHANGED", "PRODUCT", id,
                Map.of("price", oldPrice, "discountPrice", String.valueOf(oldDiscount)),
                Map.of("price", p.getPrice(), "discountPrice", String.valueOf(p.getDiscountPrice())));
        return toResponse(p, totals(List.of(id)).getOrDefault(id, 0), List.of());
    }

    /** Soft delete: history (orders, movements) keeps pointing at the row. */
    @Transactional
    public void archive(Long id, Long userId) {
        Product p = products.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        p.setActive(false);
        p.setDeletedAt(Instant.now());
        audit.record(userId, "PRODUCT_ARCHIVED", "PRODUCT", id, p.getSku(), null);
    }

    // ---------- images ----------
    @Transactional
    public List<String> addImages(Long productId, List<MultipartFile> files) throws IOException {
        Product p = products.findByIdAndDeletedAtIsNull(productId).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (files == null || files.isEmpty()) throw new BusinessRuleViolationException("No files supplied");
        List<String> urls = new ArrayList<>();
        int order = images.findByProductIdOrderBySortOrderAsc(productId).size();
        for (MultipartFile f : files) {
            byte[] data = f.getBytes();
            if (data.length == 0 || data.length > 5 * 1024 * 1024) throw new BusinessRuleViolationException("Each image must be between 1 byte and 5 MB");
            String[] type = detect(data);   // trust the bytes, not the client-supplied content type
            if (type == null) throw new BusinessRuleViolationException("Only JPEG, PNG and WebP images are allowed");
            String key = "products/" + productId + "/" + UUID.randomUUID() + "." + type[1];
            storage.store(key, data);
            ProductImage img = new ProductImage();
            img.setProduct(p);
            img.setStorageKey(key);
            img.setContentType(type[0]);
            img.setSortOrder(order);
            img.setPrimaryImage(order == 0);
            images.save(img);
            order++;
            urls.add("/files/" + key);
        }
        return urls;
    }

    static String[] detect(byte[] d) {
        if (d.length > 12 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return new String[]{"image/jpeg", "jpg"};
        if (d.length > 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return new String[]{"image/png", "png"};
        if (d.length > 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P') return new String[]{"image/webp", "webp"};
        return null;
    }

    // ---------- CSV ----------
    @Transactional(readOnly = true)
    public byte[] exportCsv() throws IOException {
        StringWriter sw = new StringWriter();
        try (CSVPrinter out = new CSVPrinter(sw, CSVFormat.DEFAULT.builder().setHeader("sku", "name", "brand", "category", "price", "discountPrice", "taxRate", "description").build())) {
            for (Product p : products.findAll(ProductSpecs.of(new ProductFilter(null, null, null, null, null, null), true), org.springframework.data.domain.Pageable.unpaged()).getContent()) {
                out.printRecord(sanitize(p.getSku()), sanitize(p.getName()), sanitize(p.getBrand()), sanitize(p.getCategory().getName()),
                    p.getPrice(), p.getDiscountPrice(), p.getTaxRate(), sanitize(p.getDescription()));
            }
        }
        return sw.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Neutralise spreadsheet formula injection in exported text cells. */
    private static String sanitize(String s) {
        if (s == null || s.isEmpty()) return s;
        char c = s.charAt(0);
        return (c == '=' || c == '+' || c == '-' || c == '@') ? "'" + s : s;
    }

    @Transactional
    public ImportResult importCsv(MultipartFile file, Long userId) throws IOException {
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true).build().parse(reader)) {
            Map<String, Category> cats = categories.findAll().stream().collect(Collectors.toMap(c -> c.getName().toLowerCase(), c -> c, (a, b) -> a));
            for (CSVRecord rec : parser) {
                if (rec.getRecordNumber() > MAX_IMPORT_ROWS) { errors.add("Row limit of " + MAX_IMPORT_ROWS + " reached"); break; }
                long row = rec.getRecordNumber() + 1;
                try {
                    String sku = rec.get("sku").toUpperCase();
                    if (sku.isBlank() || rec.get("name").isBlank()) throw new IllegalArgumentException("sku and name are required");
                    if (products.existsBySkuAndDeletedAtIsNull(sku)) { skipped++; errors.add("Row " + row + ": SKU exists, skipped"); continue; }
                    Category c = cats.get(rec.get("category").toLowerCase());
                    if (c == null) throw new IllegalArgumentException("unknown category '" + rec.get("category") + "'");
                    BigDecimal price = new BigDecimal(rec.get("price"));
                    BigDecimal discount = rec.isMapped("discountPrice") && !rec.get("discountPrice").isBlank() ? new BigDecimal(rec.get("discountPrice")) : null;
                    if (price.signum() < 0 || (discount != null && (discount.signum() < 0 || discount.compareTo(price) > 0))) throw new IllegalArgumentException("invalid price/discount");
                    Product p = new Product();
                    p.setSku(sku); p.setName(rec.get("name")); p.setCategory(c); p.setPrice(price); p.setDiscountPrice(discount);
                    p.setBrand(rec.isMapped("brand") ? rec.get("brand") : null);
                    p.setDescription(rec.isMapped("description") ? rec.get("description") : null);
                    if (rec.isMapped("taxRate") && !rec.get("taxRate").isBlank()) p.setTaxRate(new BigDecimal(rec.get("taxRate")));
                    products.save(p);
                    created++;
                } catch (IllegalArgumentException | IllegalStateException | ArithmeticException e) {
                    skipped++;
                    errors.add("Row " + row + ": " + e.getMessage());
                }
            }
        }
        audit.record(userId, "PRODUCT_CSV_IMPORT", "PRODUCT", null, null, Map.of("created", created, "skipped", skipped));
        return new ImportResult(created, skipped, errors);
    }

    // ---------- helpers ----------
    private void apply(Product p, ProductRequest r, String sku) {
        if (r.discountPrice() != null && r.discountPrice().compareTo(r.price()) > 0)
            throw new BusinessRuleViolationException("Discount price cannot exceed the list price");
        int min = r.minStockLevel() == null ? 0 : r.minStockLevel();
        if (r.maxStockLevel() != null && r.maxStockLevel() < min) throw new BusinessRuleViolationException("Max stock level cannot be below min stock level");
        Category c = categories.findById(r.categoryId()).filter(Category::isActive).orElseThrow(() -> new ResourceNotFoundException("Category not found or inactive"));
        p.setSku(sku);
        p.setName(r.name().trim());
        p.setDescription(r.description());
        p.setBrand(r.brand());
        p.setCategory(c);
        p.setPrice(r.price());
        p.setDiscountPrice(r.discountPrice());
        p.setTaxRate(r.taxRate() == null ? new BigDecimal("18.00") : r.taxRate());
        p.setWeightKg(r.weightKg());
        p.setDimensions(r.dimensions());
        p.setBarcode(r.barcode());
        p.setMinStockLevel(min);
        p.setMaxStockLevel(r.maxStockLevel());
        p.setActive(r.active() == null || r.active());
    }

    private Map<Long, Integer> totals(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return inventory.totalAvailableByProducts(ids).stream().collect(Collectors.toMap(a -> (Long) a[0], a -> ((Number) a[1]).intValue()));
    }

    private ProductResponse toResponse(Product p, int available, List<String> urls) {
        BigDecimal eff = p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice();
        return new ProductResponse(p.getId(), p.getSku(), p.getName(), p.getDescription(), p.getBrand(), p.getCategory().getId(), p.getCategory().getName(),
            p.getPrice(), p.getDiscountPrice(), eff, p.getTaxRate(), p.getWeightKg(), p.getDimensions(), p.getBarcode(), p.getMinStockLevel(),
            p.getMaxStockLevel(), p.isActive(), available, available > 0, urls, p.getCreatedAt());
    }
}
