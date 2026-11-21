package com.inventorymanagement.exception;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends BusinessException {
    public InvalidCredentialsException(String message) { super(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", message); }
}
