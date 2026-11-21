package com.inventorymanagement.controller;

import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.OrderDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.dto.PaymentDtos.*;
import com.inventorymanagement.enums.OrderStatus;
import com.inventorymanagement.enums.SimulatedOutcome;
import com.inventorymanagement.security.AuthUser;
import com.inventorymanagement.service.OrderService;
import com.inventorymanagement.service.PaymentService;
import com.inventorymanagement.util.PageUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrderController {
    private static final Set<String> SORTS = Set.of("createdAt", "total");
    private final OrderService orders;
    private final PaymentService payments;

    // ----- customer -----
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<OrderResponse> place(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody PlaceOrderRequest r,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 100) String key) {
        return ApiResponse.ok(orders.placeOrder(u.id(), r, key));
    }

    @GetMapping("/orders") @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PageResponse<OrderSummary>> mine(@AuthenticationPrincipal AuthUser u, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(orders.listForCustomer(u.id(), PageUtil.of(page, size, "createdAt", "desc", SORTS, "createdAt")));
    }

    @GetMapping("/orders/{id}") @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<OrderResponse> mine(@AuthenticationPrincipal AuthUser u, @PathVariable Long id) { return ApiResponse.ok(orders.getForCustomer(u.id(), id)); }

    @PostMapping("/orders/{id}/cancel") @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<OrderResponse> cancel(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @RequestBody(required = false) @Valid CancelRequest r) {
        return ApiResponse.ok(orders.cancel(id, u.id(), false, r == null ? null : r.reason()));
    }

    // ----- payments -----
    @PostMapping("/payments") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PaymentResponse> pay(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody PayRequest r,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 100) String key) {
        return ApiResponse.ok(payments.pay(u.id(), r, key));
    }

    @GetMapping("/payments/{id}") @PreAuthorize("isAuthenticated()")
    public ApiResponse<PaymentResponse> payment(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, org.springframework.security.core.Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ORDER_READ_ALL"));
        return ApiResponse.ok(payments.get(u.id(), admin, id));
    }

    @PostMapping("/payments/{id}/retry") @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PaymentResponse> retry(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @RequestParam(required = false) SimulatedOutcome simulate,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 100) String key) {
        return ApiResponse.ok(payments.retry(u.id(), id, key, simulate));
    }

    @PostMapping("/payments/{id}/refund") @PreAuthorize("hasAuthority('PAYMENT_REFUND')")
    public ApiResponse<PaymentResponse> refund(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @Valid @RequestBody RefundRequest r) {
        return ApiResponse.ok(payments.refund(id, r, u.id()));
    }

    // ----- admin / staff -----
    @GetMapping("/admin/orders") @PreAuthorize("hasAuthority('ORDER_READ_ALL')")
    public ApiResponse<PageResponse<OrderSummary>> all(@RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String orderNumber, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy, @RequestParam(defaultValue = "desc") String direction) {
        return ApiResponse.ok(orders.listForAdmin(status, from, to, orderNumber, PageUtil.of(page, size, sortBy, direction, SORTS, "createdAt")));
    }

    @GetMapping("/admin/orders/{id}") @PreAuthorize("hasAuthority('ORDER_READ_ALL')")
    public ApiResponse<OrderResponse> one(@PathVariable Long id) { return ApiResponse.ok(orders.getForAdmin(id)); }

    @PutMapping("/admin/orders/{id}/status") @PreAuthorize("hasAnyAuthority('ORDER_MANAGE','ORDER_FULFIL')")
    public ApiResponse<OrderResponse> status(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @Valid @RequestBody StatusUpdateRequest r) {
        return ApiResponse.ok(orders.updateStatus(id, r.status(), r.note(), u.id()));
    }
}
