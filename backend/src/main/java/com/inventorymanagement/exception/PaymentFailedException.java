package com.inventorymanagement.exception;

import org.springframework.http.HttpStatus;

public class PaymentFailedException extends BusinessException {
    public PaymentFailedException(String message) { super(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_FAILED", message); }
}
