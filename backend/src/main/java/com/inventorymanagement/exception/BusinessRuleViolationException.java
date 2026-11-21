package com.inventorymanagement.exception;

import org.springframework.http.HttpStatus;

public class BusinessRuleViolationException extends BusinessException {
    public BusinessRuleViolationException(String message) { super(HttpStatus.UNPROCESSABLE_ENTITY, "BUSINESS_RULE_VIOLATION", message); }
}
