package com.inventorymanagement.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.inventorymanagement.dto.CartDtos.AddItemRequest;
import com.inventorymanagement.dto.OrderDtos.*;
import com.inventorymanagement.dto.PaymentDtos.*;
import com.inventorymanagement.entity.*;
import com.inventorymanagement.enums.*;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.payment.PaymentGateway.ChargeResult;
import com.inventorymanagement.repository.*;
import com.inventorymanagement.service.*;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class OrderFlowIT extends AbstractIntegrationTest {
    @Autowired CartService cart;
    @Autowired OrderService orders;
    @Autowired PaymentService payments;
    @Autowired InventoryService inventory;
    @Autowired SalesOrderRepository orderRepo;
    @Autowired PaymentRepository paymentRepo;
    @Autowired InventoryMovementRepository movements;

    record Fixture(User user, Address address, Product product, Warehouse wh) {}

    private Fixture fixture(int stock) {
        User u = newCustomer();
        Product p = newProduct("1000.00", "900.00");
        Warehouse w = newWarehouse();
        stock(p, w, stock);
        return new Fixture(u, newAddress(u), p, w);
    }

    private OrderResponse place(Fixture f, int qty, String key) {
        cart.clear(f.user().getId());
        cart.addItem(f.user().getId(), new AddItemRequest(f.product().getId(), qty));
        return orders.placeOrder(f.user().getId(), new PlaceOrderRequest(f.address().getId()), key);
    }

    private Inventory inv(Fixture f) { return inventoryRepo.findByProductIdAndWarehouseId(f.product().getId(), f.wh().getId()).orElseThrow(); }

    @Test
    void placeOrder_reservesStock_usesServerPrices_andIsIdempotent() {
        Fixture f = fixture(10);
        String key = UUID.randomUUID().toString();
        OrderResponse o1 = place(f, 2, key);
        assertThat(o1.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(o1.subtotal()).isEqualByComparingTo("2000.00");
        assertThat(o1.total()).isEqualByComparingTo("2124.00");   // 1800 net + 324 tax, free shipping
        assertThat(inv(f).getAvailableQuantity()).isEqualTo(8);
        assertThat(inv(f).getReservedQuantity()).isEqualTo(2);

        OrderResponse again = orders.placeOrder(f.user().getId(), new PlaceOrderRequest(f.address().getId()), key);   // retry with same key
        assertThat(again.id()).isEqualTo(o1.id());
        assertThat(inv(f).getReservedQuantity()).isEqualTo(2);   // not reserved twice
        assertThat(orderRepo.findByUserId(f.user().getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements()).isEqualTo(1);
    }

    @Test
    void successfulPayment_confirmsOrder_andSellsReservedStock() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 3, UUID.randomUUID().toString());
        PaymentResponse pay = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        assertThat(pay.status()).isEqualTo(PaymentStatus.SUCCESS);
        SalesOrder saved = orderRepo.findById(o.id()).orElseThrow();
        assertThat(saved.getOrderStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(saved.getPaymentStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(inv(f).getAvailableQuantity()).isEqualTo(7);
        assertThat(inv(f).getReservedQuantity()).isZero();
        assertThat(movements.findByReferenceTypeAndReferenceId("ORDER", o.id())).extracting(InventoryMovement::getMovementType)
            .containsExactlyInAnyOrder(MovementType.RESERVATION, MovementType.SALE_OUT);
    }

    @Test
    void duplicateGatewayCallback_doesNotCreateASecondSale() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        PaymentResponse pay = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.CREDIT_CARD, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        payments.settle(pay.transactionReference(), new ChargeResult(true, "dup", null));   // webhook delivered again
        payments.settle(pay.transactionReference(), new ChargeResult(true, "dup", null));
        long saleOuts = movements.findByReferenceTypeAndReferenceId("ORDER", o.id()).stream().filter(m -> m.getMovementType() == MovementType.SALE_OUT).count();
        assertThat(saleOuts).isEqualTo(1);
        assertThat(paymentRepo.findByOrderIdOrderByIdDesc(o.id())).hasSize(1);
    }

    @Test
    void samePaymentKeyReplayed_returnsSamePayment() {
        Fixture f = fixture(5);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        String key = UUID.randomUUID().toString();
        PaymentResponse a = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), key);
        PaymentResponse b = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), key);
        assertThat(b.id()).isEqualTo(a.id());
        assertThat(paymentRepo.findByOrderIdOrderByIdDesc(o.id())).hasSize(1);
    }

    @Test
    void failedPayment_keepsOrderPending_thenRetrySucceeds() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        PaymentResponse failed = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.DEBIT_CARD, SimulatedOutcome.FAILURE), UUID.randomUUID().toString());
        assertThat(failed.status()).isEqualTo(PaymentStatus.FAILED);
        SalesOrder mid = orderRepo.findById(o.id()).orElseThrow();
        assertThat(mid.getOrderStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(mid.getPaymentStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(inv(f).getReservedQuantity()).isEqualTo(1);   // still held for the retry window

        PaymentResponse retried = payments.retry(f.user().getId(), failed.id(), UUID.randomUUID().toString(), SimulatedOutcome.SUCCESS);
        assertThat(retried.status()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(orderRepo.findById(o.id()).orElseThrow().getOrderStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    void cancellingPendingOrder_releasesReservation() {
        Fixture f = fixture(4);
        OrderResponse o = place(f, 4, UUID.randomUUID().toString());
        assertThat(inv(f).getAvailableQuantity()).isZero();
        orders.cancel(o.id(), f.user().getId(), false, "changed my mind");
        assertThat(inv(f).getAvailableQuantity()).isEqualTo(4);
        assertThat(inv(f).getReservedQuantity()).isZero();
        assertThrows(BusinessRuleViolationException.class, () -> orders.cancel(o.id(), f.user().getId(), false, null));   // second cancel must fail, not release twice
        assertThat(inv(f).getAvailableQuantity()).isEqualTo(4);
    }

    @Test
    void cancellingConfirmedOrder_restocksAndFullyRefunds() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 2, UUID.randomUUID().toString());
        PaymentResponse pay = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        orders.cancel(o.id(), f.user().getId(), false, null);
        assertThat(inv(f).getAvailableQuantity()).isEqualTo(10);
        assertThat(paymentRepo.findById(pay.id()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    void cancellationAfterShipment_isRejected() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        for (OrderStatus s : new OrderStatus[]{OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.SHIPPED}) orders.updateStatus(o.id(), s, null, null);
        assertThrows(BusinessRuleViolationException.class, () -> orders.cancel(o.id(), f.user().getId(), false, null));
    }

    @Test
    void refundCannotExceedPaidAmount() {
        Fixture f = fixture(10);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        PaymentResponse pay = payments.pay(f.user().getId(), new PayRequest(o.id(), PaymentMethod.UPI, SimulatedOutcome.SUCCESS), UUID.randomUUID().toString());
        assertThrows(BusinessRuleViolationException.class, () -> payments.refund(pay.id(), new RefundRequest(pay.amount().add(BigDecimal.ONE), "too much"), null));
        PaymentResponse partial = payments.refund(pay.id(), new RefundRequest(new BigDecimal("10.00"), "goodwill"), null);
        assertThat(partial.status()).isEqualTo(PaymentStatus.PARTIALLY_REFUNDED);
    }

    @Test
    void cartRejectsQuantityAboveStock_andOrderFailsAtomicallyWhenStockDisappears() {
        Fixture f = fixture(2);
        assertThrows(InsufficientStockException.class, () -> cart.addItem(f.user().getId(), new AddItemRequest(f.product().getId(), 3)));
        cart.addItem(f.user().getId(), new AddItemRequest(f.product().getId(), 2));
        inventory.adjust(new com.inventorymanagement.dto.InventoryDtos.AdjustmentRequest(f.product().getId(), f.wh().getId(), -2, "shrinkage"), null);   // stock vanishes after carting
        assertThrows(InsufficientStockException.class, () -> orders.placeOrder(f.user().getId(), new PlaceOrderRequest(f.address().getId()), UUID.randomUUID().toString()));
        assertThat(orderRepo.findByUserId(f.user().getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements()).isZero();
        assertThat(inv(f).getReservedQuantity()).isZero();
    }

    @Test
    void customerCannotReadAnotherCustomersOrder() {
        Fixture f = fixture(5);
        OrderResponse o = place(f, 1, UUID.randomUUID().toString());
        User other = newCustomer();
        assertThrows(ResourceNotFoundException.class, () -> orders.getForCustomer(other.getId(), o.id()));
    }
}
