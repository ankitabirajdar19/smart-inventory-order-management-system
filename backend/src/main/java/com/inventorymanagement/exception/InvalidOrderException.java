package com.inventorymanagement.exception;

import org.springframework.http.HttpStatus;

public class InvalidOrderException extends BusinessException {
    public InvalidOrderException(String message) { super(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_ORDER", message); }
}
