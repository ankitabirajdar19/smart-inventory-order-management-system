package com.inventorymanagement.config;

import com.inventorymanagement.dto.InventoryDtos.AdjustmentRequest;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.repository.*;
import com.inventorymanagement.service.InventoryService;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Development-only demo data. Never runs unless the 'dev' profile is active. */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {
    private final UserRepository users;
    private final RoleRepository roles;
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final WarehouseRepository warehouses;
    private final InventoryService inventory;
    private final PasswordEncoder encoder;
    @Value("${app.dev-seed.password}") private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        String[][] accounts = {
            {"superadmin@example.com", "Sam Super", "SUPER_ADMIN"}, {"admin@example.com", "Asha Admin", "ADMIN"},
            {"manager@example.com", "Iman Manager", "INVENTORY_MANAGER"}, {"staff@example.com", "Wes Warehouse", "WAREHOUSE_STAFF"},
            {"customer1@example.com", "Chitra Customer", "CUSTOMER"}, {"customer2@example.com", "Chirag Customer", "CUSTOMER"}};
        Long adminId = null;
        for (String[] a : accounts) {
            User u = new User();
            u.setEmail(a[0]); u.setFullName(a[1]); u.setPasswordHash(encoder.encode(password)); u.setEmailVerified(true);
            u.getRoles().add(roles.findByName(a[2]).orElseThrow());
            u = users.save(u);
            if (a[2].equals("ADMIN")) adminId = u.getId();
        }
        Map<String, Category> cats = new LinkedHashMap<>();
        for (String n : List.of("Smartphones", "Laptops", "Audio", "Accessories", "Wearables")) {
            Category c = new Category(); c.setName(n); c.setSlug(n.toLowerCase()); cats.put(n, categories.save(c));
        }
        Warehouse w1 = wh("Pune Central", "WH-PUNE", "Pune"), w2 = wh("Mumbai Hub", "WH-MUM", "Mumbai");
        Object[][] items = {
            {"Smartphones", "Nova X1 5G", "Nova", 24999, 22999}, {"Smartphones", "Nova X1 Lite", "Nova", 14999, null}, {"Smartphones", "Pixelon P7", "Pixelon", 31999, 29999},
            {"Smartphones", "Orbit S3", "Orbit", 18999, null}, {"Laptops", "ZenBook Air 14", "Zenith", 74999, 69999}, {"Laptops", "ProStation 15", "Zenith", 114999, null},
            {"Laptops", "Lite Student 13", "Orbit", 38999, 35999}, {"Laptops", "GameForge G5", "Forge", 89999, 84999}, {"Audio", "BassPods Pro", "Sonic", 4999, 3999},
            {"Audio", "StudioCans 700", "Sonic", 12999, null}, {"Audio", "Portable Boom Mini", "Sonic", 2999, 2499}, {"Audio", "Soundbar Slim", "Orbit", 8999, null},
            {"Accessories", "65W GaN Charger", "Voltix", 1999, 1599}, {"Accessories", "USB-C Hub 7-in-1", "Voltix", 2999, null}, {"Accessories", "Braided Cable 2m", "Voltix", 499, 399},
            {"Accessories", "Laptop Sleeve 14in", "Carry", 1299, null}, {"Wearables", "FitBand 6", "Pulse", 3499, 2999}, {"Wearables", "Pulse Watch Ultra", "Pulse", 15999, null},
            {"Wearables", "KidTrack Watch", "Pulse", 4999, 4499}, {"Wearables", "Sleep Ring", "Pulse", 17999, null}};
        int i = 0;
        for (Object[] it : items) {
            Product p = new Product();
            p.setSku("SKU-" + String.format("%03d", ++i)); p.setName((String) it[1]); p.setBrand((String) it[2]); p.setCategory(cats.get((String) it[0]));
            p.setPrice(BigDecimal.valueOf((Integer) it[3]).setScale(2)); p.setDiscountPrice(it[4] == null ? null : BigDecimal.valueOf((Integer) it[4]).setScale(2));
            p.setDescription("Demo product: " + it[1]);
            p = products.save(p);
            int s1 = i == 4 ? 3 : (i == 9 ? 0 : 40 + (i * 7) % 40), s2 = 25 + (i * 5) % 30;   // product 4 low stock, product 9 out of stock in WH1
            if (s1 > 0) inventory.adjust(new AdjustmentRequest(p.getId(), w1.getId(), s1, "Initial stock"), adminId);
            inventory.adjust(new AdjustmentRequest(p.getId(), w2.getId(), s2, "Initial stock"), adminId);
        }
        log.info("Dev seed complete. Demo logins: admin@example.com / customer1@example.com (password from app.dev-seed.password)");
    }

    private Warehouse wh(String name, String code, String location) {
        Warehouse w = new Warehouse(); w.setName(name); w.setCode(code); w.setLocation(location); return warehouses.save(w);
    }
}
