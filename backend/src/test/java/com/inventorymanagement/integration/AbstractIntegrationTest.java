package com.inventorymanagement.integration;

import com.inventorymanagement.entity.*;
import com.inventorymanagement.repository.*;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(properties = {
    "app.jwt.secret=integration-test-secret-integration-test-secret",
    "app.payment.allow-simulation=true",
    "app.cookie.secure=false",
    "app.rate-limit.auth-per-minute=1000",
    "app.order.expiry-check-interval-ms=3600000"})
public abstract class AbstractIntegrationTest {
    // One container for the whole test JVM (singleton pattern) so Spring's cached contexts keep a valid datasource.
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16-alpine");
    static { PG.start(); }

    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", PG::getJdbcUrl);
        r.add("spring.datasource.username", PG::getUsername);
        r.add("spring.datasource.password", PG::getPassword);
    }

    @Autowired protected UserRepository users;
    @Autowired protected CategoryRepository categories;
    @Autowired protected ProductRepository products;
    @Autowired protected WarehouseRepository warehouses;
    @Autowired protected InventoryRepository inventoryRepo;
    @Autowired protected AddressRepository addresses;

    protected Product newProduct(String price, String discount) {
        Category c = new Category();
        String n = "Cat-" + UUID.randomUUID();
        c.setName(n); c.setSlug(n);
        c = categories.save(c);
        Product p = new Product();
        p.setSku("T-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        p.setName("Test product"); p.setCategory(c);
        p.setPrice(new BigDecimal(price)); p.setDiscountPrice(discount == null ? null : new BigDecimal(discount));
        return products.save(p);
    }

    protected Warehouse newWarehouse() {
        Warehouse w = new Warehouse();
        w.setName("WH " + UUID.randomUUID()); w.setCode("W" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        return warehouses.save(w);
    }

    protected Inventory stock(Product p, Warehouse w, int available) {
        Inventory i = new Inventory();
        i.setProduct(p); i.setWarehouse(w); i.setAvailableQuantity(available);
        return inventoryRepo.save(i);
    }

    protected User newCustomer() {
        User u = new User();
        u.setEmail("c" + UUID.randomUUID() + "@test.local"); u.setFullName("Test Customer"); u.setPasswordHash("x");
        return users.save(u);
    }

    protected Address newAddress(User u) {
        Address a = new Address();
        a.setUserId(u.getId()); a.setFullName("T"); a.setPhone("9999999999"); a.setLine1("1 Test Rd"); a.setCity("Pune");
        a.setState("MH"); a.setPostalCode("411001"); a.setCountry("India");
        return addresses.save(a);
    }
}
