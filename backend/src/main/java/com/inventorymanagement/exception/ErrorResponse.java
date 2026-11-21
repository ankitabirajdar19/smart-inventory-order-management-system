package com.inventorymanagement.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(Instant timestamp, int status, String code, String message, String path, List<FieldIssue> details) {
    public record FieldIssue(String field, String message) {}
}
