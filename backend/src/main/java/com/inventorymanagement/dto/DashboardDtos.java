package com.inventorymanagement.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class DashboardDtos {
    private DashboardDtos() {}

    /** Low/out-of-stock are counted per inventory record (product x warehouse), matching the low-stock list endpoint. */
    public record InventoryStats(long totalProducts, long warehouses, long stockRecords, long availableUnits, long reservedUnits,
                                 BigDecimal inventoryValue, long lowStockRecords, long outOfStockRecords) {}

    /** Revenue = sum of totals of orders that reached CONFIRMED or later (excludes PENDING, CANCELLED, returns). */
    public record SalesStats(long ordersInPeriod, long previousOrders, BigDecimal revenue, BigDecimal previousRevenue,
                             long revenueOrders, BigDecimal averageOrderValue, long pendingOrders) {}
    public record DailyPoint(LocalDate day, long orders, BigDecimal revenue) {}
    public record StatusCount(String status, long count) {}
    public record TopProduct(Long productId, String name, String sku, long units, BigDecimal revenue) {}
    public record WarehouseStock(Long warehouseId, String name, long available, long reserved) {}

    public record DashboardSummary(Instant generatedAt, LocalDate from, LocalDate to, InventoryStats inventory, SalesStats sales,
                                   List<DailyPoint> daily, List<StatusCount> ordersByStatus, List<TopProduct> topProducts,
                                   List<WarehouseStock> stockByWarehouse) {}
}
