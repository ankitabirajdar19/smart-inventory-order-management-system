package com.inventorymanagement.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ErrorResponse> business(BusinessException e, HttpServletRequest r) {
        return build(e.getStatus(), e.getCode(), e.getMessage(), r, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException e, HttpServletRequest r) {
        List<ErrorResponse.FieldIssue> d = e.getBindingResult().getFieldErrors().stream()
            .map(f -> new ErrorResponse.FieldIssue(f.getField(), f.getDefaultMessage())).toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", r, d);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorResponse> constraint(ConstraintViolationException e, HttpServletRequest r) {
        List<ErrorResponse.FieldIssue> d = e.getConstraintViolations().stream()
            .map(v -> new ErrorResponse.FieldIssue(v.getPropertyPath().toString(), v.getMessage())).toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", r, d);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingRequestHeaderException.class,
        MethodArgumentTypeMismatchException.class, MaxUploadSizeExceededException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception e, HttpServletRequest r) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Malformed or missing request data", r, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> denied(AccessDeniedException e, HttpServletRequest r) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "You do not have permission to perform this action", r, null);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ErrorResponse> unauthenticated(AuthenticationException e, HttpServletRequest r) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required", r, null);
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
    ResponseEntity<ErrorResponse> concurrent(Exception e, HttpServletRequest r) {
        log.warn("Concurrent update conflict on {}", r.getRequestURI());
        return build(HttpStatus.CONFLICT, "CONCURRENT_UPDATE", "The resource was modified concurrently, please retry", r, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> integrity(DataIntegrityViolationException e, HttpServletRequest r) {
        log.warn("Data integrity violation on {}: {}", r.getRequestURI(), e.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "CONFLICT", "The request conflicts with existing data or another in-flight request; retry if appropriate", r, null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception e, HttpServletRequest r) {
        log.error("Unhandled error on {}", r.getRequestURI(), e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred", r, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus s, String code, String msg, HttpServletRequest r, List<ErrorResponse.FieldIssue> d) {
        return ResponseEntity.status(s).body(new ErrorResponse(Instant.now(), s.value(), code, msg, r.getRequestURI(), d));
    }
}
