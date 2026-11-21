package com.inventorymanagement.service;

import com.inventorymanagement.entity.OrderStatusHistory;
import com.inventorymanagement.enums.OrderStatus;
import com.inventorymanagement.repository.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderHistoryRecorder {
    private final OrderStatusHistoryRepository repo;

    public void record(Long orderId, OrderStatus from, OrderStatus to, Long actorId, String note) {
        OrderStatusHistory h = new OrderStatusHistory();
        h.setOrderId(orderId); h.setFromStatus(from); h.setToStatus(to); h.setChangedBy(actorId); h.setNote(note);
        repo.save(h);
    }
}
