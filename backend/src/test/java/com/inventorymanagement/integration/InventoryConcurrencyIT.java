package com.inventorymanagement.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.inventorymanagement.dto.InventoryDtos.TransferRequest;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.exception.InsufficientStockException;
import com.inventorymanagement.repository.InventoryMovementRepository;
import com.inventorymanagement.service.InventoryService;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class InventoryConcurrencyIT extends AbstractIntegrationTest {
    @Autowired InventoryService inventory;
    @Autowired InventoryMovementRepository movements;
    @Autowired PlatformTransactionManager tm;

    @Test
    void thirtyConcurrentBuyersForTenUnits_neverOversell() throws Exception {
        Product p = newProduct("100.00", null);
        Warehouse w = newWarehouse();
        stock(p, w, 10);
        TransactionTemplate tx = new TransactionTemplate(tm);
        int threads = 30;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger(), rejected = new AtomicInteger();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            long orderId = 900_000L + i;
            fs.add(pool.submit(() -> {
                go.await();
                try { tx.executeWithoutResult(s -> inventory.reserve(p.getId(), 1, orderId, null)); ok.incrementAndGet(); }
                catch (InsufficientStockException e) { rejected.incrementAndGet(); }
                return null;
            }));
        }
        go.countDown();
        for (Future<?> f : fs) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        Inventory after = inventoryRepo.findByProductIdAndWarehouseId(p.getId(), w.getId()).orElseThrow();
        assertThat(ok.get()).isEqualTo(10);
        assertThat(rejected.get()).isEqualTo(20);
        assertThat(after.getAvailableQuantity()).isZero();
        assertThat(after.getReservedQuantity()).isEqualTo(10);
        assertThat(movements.findByProductId(p.getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements()).isEqualTo(10);
    }

    @Test
    void oppositeTransfersRunInParallel_withoutDeadlockAndConserveStock() throws Exception {
        Product p = newProduct("10.00", null);
        Warehouse a = newWarehouse(), b = newWarehouse();
        stock(p, a, 100); stock(p, b, 100);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            boolean forward = i % 2 == 0;
            fs.add(pool.submit(() -> inventory.transfer(new TransferRequest(p.getId(), forward ? a.getId() : b.getId(), forward ? b.getId() : a.getId(), 1, "test"), null)));
        }
        for (Future<?> f : fs) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();
        int total = inventoryRepo.findByProductIdAndWarehouseId(p.getId(), a.getId()).orElseThrow().getAvailableQuantity()
                  + inventoryRepo.findByProductIdAndWarehouseId(p.getId(), b.getId()).orElseThrow().getAvailableQuantity();
        assertThat(total).isEqualTo(200);
    }

    @Test
    void transferBeyondAvailable_isRejectedAndLeavesStockUntouched() {
        Product p = newProduct("10.00", null);
        Warehouse a = newWarehouse(), b = newWarehouse();
        stock(p, a, 5);
        org.junit.jupiter.api.Assertions.assertThrows(InsufficientStockException.class,
            () -> inventory.transfer(new TransferRequest(p.getId(), a.getId(), b.getId(), 6, "too many"), null));
        assertThat(inventoryRepo.findByProductIdAndWarehouseId(p.getId(), a.getId()).orElseThrow().getAvailableQuantity()).isEqualTo(5);
    }
}
