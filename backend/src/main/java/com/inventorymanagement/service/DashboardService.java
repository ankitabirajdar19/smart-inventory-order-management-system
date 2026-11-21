package com.inventorymanagement.service;

import com.inventorymanagement.dto.DashboardDtos.*;
import com.inventorymanagement.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only aggregates computed in SQL (never from paginated lists). All timestamps are handled in UTC. */
@Service
@RequiredArgsConstructor
public class DashboardService {
    private static final String REV = "('CONFIRMED','PROCESSING','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED')";
    private static final int MAX_DAYS = 366;
    private final JdbcTemplate jdbc;

    private record Period(long orders, BigDecimal revenue, long revenueOrders) {}

    @Transactional(readOnly = true)
    public DashboardSummary summary(LocalDate from, LocalDate to) {
        LocalDate end = to == null ? LocalDate.now(ZoneOffset.UTC) : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) throw new BusinessRuleViolationException("'from' must not be after 'to'");
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days > MAX_DAYS) throw new BusinessRuleViolationException("The date range cannot exceed " + MAX_DAYS + " days");

        OffsetDateTime fromTs = start.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toTs = end.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        Period cur = period(fromTs, toTs);
        Period prev = period(fromTs.minusDays(days), fromTs);

        BigDecimal aov = cur.revenueOrders() == 0 ? BigDecimal.ZERO.setScale(2)
            : cur.revenue().divide(BigDecimal.valueOf(cur.revenueOrders()), 2, RoundingMode.HALF_UP);
        long pending = jdbc.queryForObject("SELECT count(*) FROM orders WHERE order_status = 'PENDING'", Long.class);

        return new DashboardSummary(Instant.now(), start, end, inventory(),
            new SalesStats(cur.orders(), prev.orders(), cur.revenue(), prev.revenue(), cur.revenueOrders(), aov, pending),
            daily(start, end), statusCounts(fromTs, toTs), topProducts(fromTs, toTs), stockByWarehouse());
    }

    private Period period(OffsetDateTime from, OffsetDateTime to) {
        return jdbc.queryForObject(
            "SELECT count(*) AS orders, COALESCE(SUM(total) FILTER (WHERE order_status IN " + REV + "), 0) AS revenue, "
                + "count(*) FILTER (WHERE order_status IN " + REV + ") AS revenue_orders "
                + "FROM orders WHERE created_at >= ? AND created_at < ?",
            (rs, n) -> new Period(rs.getLong("orders"), rs.getBigDecimal("revenue"), rs.getLong("revenue_orders")), from, to);
    }

    private InventoryStats inventory() {
        return jdbc.queryForObject(
            "SELECT (SELECT count(*) FROM products WHERE deleted_at IS NULL) AS products, "
                + "(SELECT count(*) FROM warehouses WHERE active) AS warehouses, "
                + "count(i.id) AS records, COALESCE(SUM(i.available_quantity), 0) AS available, COALESCE(SUM(i.reserved_quantity), 0) AS reserved, "
                + "COALESCE(SUM((i.available_quantity + i.reserved_quantity) * COALESCE(p.discount_price, p.price)), 0) AS value, "
                + "count(i.id) FILTER (WHERE i.available_quantity > 0 AND i.available_quantity <= i.reorder_level) AS low, "
                + "count(i.id) FILTER (WHERE i.available_quantity = 0) AS oos "
                + "FROM inventory i JOIN products p ON p.id = i.product_id AND p.deleted_at IS NULL",
            (rs, n) -> new InventoryStats(rs.getLong("products"), rs.getLong("warehouses"), rs.getLong("records"), rs.getLong("available"),
                rs.getLong("reserved"), rs.getBigDecimal("value"), rs.getLong("low"), rs.getLong("oos")));
    }

    private List<DailyPoint> daily(LocalDate start, LocalDate end) {
        return jdbc.query(
            "SELECT g.day AS day, count(o.id) AS orders, COALESCE(SUM(o.total) FILTER (WHERE o.order_status IN " + REV + "), 0) AS revenue "
                + "FROM generate_series(?::date::timestamp, ?::date::timestamp, interval '1 day') AS g(day) "
                + "LEFT JOIN orders o ON o.created_at >= (g.day AT TIME ZONE 'UTC') AND o.created_at < ((g.day + interval '1 day') AT TIME ZONE 'UTC') "
                + "GROUP BY g.day ORDER BY g.day",
            (rs, n) -> new DailyPoint(rs.getTimestamp("day").toLocalDateTime().toLocalDate(), rs.getLong("orders"), rs.getBigDecimal("revenue")), start, end);
    }

    private List<StatusCount> statusCounts(OffsetDateTime from, OffsetDateTime to) {
        return jdbc.query("SELECT order_status, count(*) AS c FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY order_status ORDER BY c DESC",
            (rs, n) -> new StatusCount(rs.getString("order_status"), rs.getLong("c")), from, to);
    }

    private List<TopProduct> topProducts(OffsetDateTime from, OffsetDateTime to) {
        return jdbc.query(
            "SELECT oi.product_id, MAX(oi.product_name) AS name, MAX(oi.sku) AS sku, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue "
                + "FROM order_items oi JOIN orders o ON o.id = oi.order_id "
                + "WHERE o.order_status IN " + REV + " AND o.created_at >= ? AND o.created_at < ? "
                + "GROUP BY oi.product_id ORDER BY units DESC, revenue DESC LIMIT 5",
            (rs, n) -> new TopProduct(rs.getLong("product_id"), rs.getString("name"), rs.getString("sku"), rs.getLong("units"), rs.getBigDecimal("revenue")), from, to);
    }

    private List<WarehouseStock> stockByWarehouse() {
        return jdbc.query(
            "SELECT w.id, w.name, COALESCE(SUM(i.available_quantity), 0) AS available, COALESCE(SUM(i.reserved_quantity), 0) AS reserved "
                + "FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id = w.id WHERE w.active GROUP BY w.id, w.name ORDER BY w.name",
            (rs, n) -> new WarehouseStock(rs.getLong("id"), rs.getString("name"), rs.getLong("available"), rs.getLong("reserved")));
    }
}
