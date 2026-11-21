package com.inventorymanagement.scheduler;

import com.inventorymanagement.enums.OrderStatus;
import com.inventorymanagement.repository.SalesOrderRepository;
import com.inventorymanagement.service.OrderService;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Releases stock held by unpaid orders. Each order is its own transaction; re-running is harmless. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationExpiryJob {
    private final SalesOrderRepository orders;
    private final OrderService orderService;

    @Scheduled(fixedDelayString = "${app.order.expiry-check-interval-ms:60000}")
    public void releaseExpired() {
        for (var o : orders.findTop100ByOrderStatusAndExpiresAtBefore(OrderStatus.PENDING, Instant.now())) {
            try { orderService.expire(o.getId()); }
            catch (RuntimeException e) { log.error("Failed to expire order {}", o.getId(), e); }
        }
    }
}
