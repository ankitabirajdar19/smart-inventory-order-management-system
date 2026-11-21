package com.inventorymanagement.controller;

import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.InventoryDtos.*;
import com.inventorymanagement.dto.PageResponse;
import com.inventorymanagement.security.AuthUser;
import com.inventorymanagement.service.InventoryService;
import com.inventorymanagement.service.WarehouseService;
import com.inventorymanagement.util.PageUtil;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventory;
    private final WarehouseService warehouses;

    @GetMapping("/warehouses") @PreAuthorize("hasAuthority('INVENTORY_READ')")
    public ApiResponse<List<WarehouseResponse>> warehouses() { return ApiResponse.ok(warehouses.list()); }

    @PostMapping("/warehouses") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('WAREHOUSE_MANAGE')")
    public ApiResponse<WarehouseResponse> createWarehouse(@Valid @RequestBody WarehouseRequest r) { return ApiResponse.ok(warehouses.create(r)); }

    @PutMapping("/warehouses/{id}") @PreAuthorize("hasAuthority('WAREHOUSE_MANAGE')")
    public ApiResponse<WarehouseResponse> updateWarehouse(@PathVariable Long id, @Valid @RequestBody WarehouseRequest r) { return ApiResponse.ok(warehouses.update(id, r)); }

    @GetMapping("/warehouses/{id}/inventory") @PreAuthorize("hasAuthority('INVENTORY_READ')")
    public ApiResponse<PageResponse<InventoryResponse>> warehouseInventory(@PathVariable Long id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(inventory.list(id, PageUtil.of(page, size, "id", "asc", Set.of("id"), "id")));
    }

    @GetMapping("/inventory") @PreAuthorize("hasAuthority('INVENTORY_READ')")
    public ApiResponse<PageResponse<InventoryResponse>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(inventory.list(null, PageUtil.of(page, size, "id", "asc", Set.of("id"), "id")));
    }

    @GetMapping("/inventory/low-stock") @PreAuthorize("hasAuthority('INVENTORY_READ')")
    public ApiResponse<PageResponse<InventoryResponse>> lowStock(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(inventory.lowStock(PageUtil.of(page, size, "availableQuantity", "asc", Set.of("availableQuantity"), "availableQuantity")));
    }

    @PostMapping("/inventory/adjustments") @PreAuthorize("hasAuthority('INVENTORY_WRITE')")
    public ApiResponse<InventoryResponse> adjust(@Valid @RequestBody AdjustmentRequest r, @AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(inventory.adjust(r, u.id())); }

    @PostMapping("/inventory/transfers") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('INVENTORY_WRITE')")
    public void transfer(@Valid @RequestBody TransferRequest r, @AuthenticationPrincipal AuthUser u) { inventory.transfer(r, u.id()); }

    @GetMapping("/inventory/movements") @PreAuthorize("hasAuthority('INVENTORY_READ')")
    public ApiResponse<PageResponse<MovementResponse>> movements(@RequestParam(required = false) Long productId, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(inventory.movements(productId, PageUtil.of(page, size, "createdAt", "desc", Set.of("createdAt"), "createdAt")));
    }
}
