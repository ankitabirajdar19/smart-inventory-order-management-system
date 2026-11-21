package com.inventorymanagement.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.inventorymanagement.dto.CartDtos.AddItemRequest;
import com.inventorymanagement.dto.OrderDtos.*;
import com.inventorymanagement.dto.PaymentDtos.PayRequest;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.enums.*;
import com.inventorymanagement.exception.BusinessRuleViolationException;
import com.inventorymanagement.service.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Uses before/after deltas because the database is shared with other integration tests. */
class DashboardSummaryIT extends AbstractIntegrationTest {
    @Autowired DashboardService dashboard;
    @Autowired CartService cart;
    @Autowired OrderService orders;
    @Autowired PaymentService payments;

    @Test
    void inventoryMetrics_reflectStockAndValuation() {
        var before = dashboard.summary(null, null).inventory();
        Product p = newProduct("100.00", "80.00");
        Warehouse w = newWarehouse();
        stock(p, w, 5);
        var after = dashboard.summary(null, null).inventory();
        assertThat(after.totalProducts()).isEqualTo(before.totalProducts() + 1);
        assertThat(after.warehouses()).isEqualTo(before.warehouses() + 1);
        assertThat(after.availableUnits()).isEqualTo(before.availableUnits() + 5);
        assertThat(after.inventoryValue().subtract(before.inventoryValue())).isEqualByComparingTo("400.00");   // 5 x discounted 80.00
        assertThat(after.lowStockRecords()).isEqualTo(before.lowStockRecords() + 1);                          // 5 <= default reorder level 10
    }

    @Test
    void revenue_countsOnlyConfirmedOrders_andPendingIsReported() {
        var before = dashboard.summary(null, null).sales();
        User u = newCustomer();
        Address a = newAddress(u);
        Product p = newProduct("1000.00", "900.00");
        stock(p, newWarehouse(), 10);
        cart.addItem(u.getId(), new AddItemRequest(p.getId(), 1));
        OrderResponse o = orders.placeOrder(u.getId(), new PlaceOrderRequest(a.getId()), UUID.randomUUID().toString());

        var pending = dashboard.summary(null, null).sales();
        assertThat(pending.ordersInPeriod()).isEqualTo(before.ordersInPeriod() + 1);
        assertThat(pending.pendingOrders()).isEqualTo(before.pendingOrders() + 1);
        assertThat(pending.revenue()).isEqualByComparingTo(before.revenue());                  // unpaid order is not revenue

        payments.pay(u.getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        var paid = dashboard.summary(null, null).sales();
        assertThat(paid.revenue().subtract(before.revenue())).isEqualByComparingTo(o.total());
        assertThat(paid.revenueOrders()).isEqualTo(before.revenueOrders() + 1);
        assertThat(paid.pendingOrders()).isEqualTo(before.pendingOrders());
    }

    @Test
    void dailySeries_coversEveryDayInRange_andRejectsBadRanges() {
        LocalDate to = LocalDate.now(java.time.ZoneOffset.UTC);
        var s = dashboard.summary(to.minusDays(6), to);
        assertThat(s.daily()).hasSize(7);
        assertThrows(BusinessRuleViolationException.class, () -> dashboard.summary(to, to.minusDays(1)));
        assertThrows(BusinessRuleViolationException.class, () -> dashboard.summary(to.minusDays(400), to));
    }
}
