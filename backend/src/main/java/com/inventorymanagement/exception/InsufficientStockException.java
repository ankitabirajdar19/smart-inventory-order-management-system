package com.inventorymanagement.exception;

import org.springframework.http.HttpStatus;

public class InsufficientStockException extends BusinessException {
    public InsufficientStockException(Long productId, int requested, int available) {
        super(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK",
            "Insufficient stock for product " + productId + ": requested " + requested + ", available " + available);
    }
}
