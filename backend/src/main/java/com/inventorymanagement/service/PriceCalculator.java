package com.inventorymanagement.service;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.CartDtos.CartTotals;
import com.inventorymanagement.entity.Product;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Component;

/** All pricing lives here: the backend is the only source of truth for money. */
@Component
public class PriceCalculator {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private final AppProperties props;

    public PriceCalculator(AppProperties props) { this.props = props; }

    public record Line(Product product, int quantity) {}

    public static BigDecimal unitPrice(Product p) { return p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice(); }

    /** Tax is computed per line on the discounted price and rounded HALF_UP to 2 dp; shipping is free above the threshold. */
    public CartTotals calculate(List<Line> lines) {
        BigDecimal zero = BigDecimal.ZERO.setScale(2);
        if (lines.isEmpty()) return new CartTotals(zero, zero, zero, zero, zero);
        BigDecimal subtotal = zero, discount = zero, tax = zero, net = zero;
        for (Line l : lines) {
            BigDecimal q = BigDecimal.valueOf(l.quantity());
            BigDecimal unit = unitPrice(l.product());
            BigDecimal lineNet = unit.multiply(q);
            subtotal = subtotal.add(l.product().getPrice().multiply(q));
            discount = discount.add(l.product().getPrice().subtract(unit).multiply(q));
            tax = tax.add(lineNet.multiply(l.product().getTaxRate()).divide(HUNDRED, 2, RoundingMode.HALF_UP));
            net = net.add(lineNet);
        }
        BigDecimal shipping = net.compareTo(props.shipping().freeThreshold()) >= 0 ? zero : props.shipping().flatFee();
        BigDecimal total = net.add(tax).add(shipping);
        return new CartTotals(s(subtotal), s(discount), s(tax), s(shipping), s(total));
    }

    private static BigDecimal s(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP); }
}
