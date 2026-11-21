package com.inventorymanagement.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.CartDtos.CartTotals;
import com.inventorymanagement.entity.Product;
import com.inventorymanagement.service.PriceCalculator;
import com.inventorymanagement.service.PriceCalculator.Line;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class PriceCalculatorTest {
    private final PriceCalculator calc = new PriceCalculator(new AppProperties(null, null, null, null,
        new AppProperties.Shipping(new BigDecimal("50.00"), new BigDecimal("1000.00")), null, null, null, null));

    private static Product product(String price, String discount, String tax) {
        Product p = new Product();
        p.setPrice(new BigDecimal(price));
        p.setDiscountPrice(discount == null ? null : new BigDecimal(discount));
        p.setTaxRate(new BigDecimal(tax));
        return p;
    }

    @Test
    void discountedLineAboveThreshold_hasFreeShipping() {
        CartTotals t = calc.calculate(List.of(new Line(product("1000.00", "900.00", "18.00"), 2)));
        assertThat(t.subtotal()).isEqualByComparingTo("2000.00");
        assertThat(t.discount()).isEqualByComparingTo("200.00");
        assertThat(t.tax()).isEqualByComparingTo("324.00");
        assertThat(t.shipping()).isEqualByComparingTo("0.00");
        assertThat(t.total()).isEqualByComparingTo("2124.00");
    }

    @Test
    void smallOrder_paysFlatShipping() {
        CartTotals t = calc.calculate(List.of(new Line(product("100.00", null, "18.00"), 1)));
        assertThat(t.tax()).isEqualByComparingTo("18.00");
        assertThat(t.shipping()).isEqualByComparingTo("50.00");
        assertThat(t.total()).isEqualByComparingTo("168.00");
    }

    @Test
    void taxRoundsHalfUpToTwoDecimals() {
        CartTotals t = calc.calculate(List.of(new Line(product("99.99", null, "18.00"), 3)));   // 299.97 * 18% = 53.9946
        assertThat(t.tax()).isEqualByComparingTo("53.99");
        assertThat(t.total()).isEqualByComparingTo("403.96");
    }

    @Test
    void emptyCart_isAllZero() {
        CartTotals t = calc.calculate(List.of());
        assertThat(t.total()).isEqualByComparingTo("0.00");
        assertThat(t.shipping()).isEqualByComparingTo("0.00");
    }
}
