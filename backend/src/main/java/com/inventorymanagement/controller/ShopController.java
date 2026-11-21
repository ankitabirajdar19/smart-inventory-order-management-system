package com.inventorymanagement.controller;

import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.CartDtos.*;
import com.inventorymanagement.security.AuthUser;
import com.inventorymanagement.service.AddressService;
import com.inventorymanagement.service.CartService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasRole('CUSTOMER')")
@RequiredArgsConstructor
public class ShopController {
    private final CartService cart;
    private final AddressService addresses;

    @GetMapping("/cart") public ApiResponse<CartResponse> cart(@AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(cart.get(u.id())); }

    @PostMapping("/cart/items") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CartResponse> add(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody AddItemRequest r) { return ApiResponse.ok(cart.addItem(u.id(), r)); }

    @PutMapping("/cart/items/{id}")
    public ApiResponse<CartResponse> update(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @Valid @RequestBody UpdateQuantityRequest r) { return ApiResponse.ok(cart.updateQuantity(u.id(), id, r.quantity())); }

    @DeleteMapping("/cart/items/{id}")
    public ApiResponse<CartResponse> remove(@AuthenticationPrincipal AuthUser u, @PathVariable Long id) { return ApiResponse.ok(cart.removeItem(u.id(), id)); }

    @DeleteMapping("/cart") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal AuthUser u) { cart.clear(u.id()); }

    @GetMapping("/addresses") public ApiResponse<List<AddressResponse>> addresses(@AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(addresses.list(u.id())); }

    @PostMapping("/addresses") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AddressResponse> createAddress(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody AddressRequest r) { return ApiResponse.ok(addresses.create(u.id(), r)); }

    @PutMapping("/addresses/{id}")
    public ApiResponse<AddressResponse> updateAddress(@AuthenticationPrincipal AuthUser u, @PathVariable Long id, @Valid @RequestBody AddressRequest r) { return ApiResponse.ok(addresses.update(u.id(), id, r)); }

    @PutMapping("/addresses/{id}/default")
    public ApiResponse<AddressResponse> makeDefault(@AuthenticationPrincipal AuthUser u, @PathVariable Long id) { return ApiResponse.ok(addresses.makeDefault(u.id(), id)); }

    @DeleteMapping("/addresses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAddress(@AuthenticationPrincipal AuthUser u, @PathVariable Long id) { addresses.delete(u.id(), id); }
}
