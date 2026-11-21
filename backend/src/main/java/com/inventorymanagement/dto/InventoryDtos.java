package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import com.inventorymanagement.enums.MovementType;
import java.time.Instant;

public final class InventoryDtos {
    private InventoryDtos() {}
    public record AdjustmentRequest(@NotNull Long productId, @NotNull Long warehouseId, @NotNull Integer delta, @NotBlank @Size(max = 255) String reason) {}
    public record TransferRequest(@NotNull Long productId, @NotNull Long sourceWarehouseId, @NotNull Long destinationWarehouseId,
                                  @Min(1) int quantity, @Size(max = 255) String reason) {}
    public record InventoryResponse(Long id, Long productId, String sku, String productName, Long warehouseId, String warehouseName,
                                    int availableQuantity, int reservedQuantity, int reorderLevel, boolean lowStock) {}
    public record MovementResponse(Long id, Long productId, Long warehouseId, MovementType type, int quantity, int previousQuantity,
        int newQuantity, int previousReserved, int newReserved, String referenceType, Long referenceId, String reason, Long performedBy, Instant createdAt) {}
    public record WarehouseRequest(@NotBlank @Size(max = 150) String name, @NotBlank @Size(max = 20) String code,
        @Size(max = 150) String location, String address, @Size(max = 20) String contactNumber, Long managerId, Boolean active) {}
    public record WarehouseResponse(Long id, String name, String code, String location, String address, String contactNumber, Long managerId, boolean active) {}
}
