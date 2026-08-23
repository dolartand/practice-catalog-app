package com.practice.catalog.catalog.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PriceCalculatorTest {

    @Test
    void noDiscountKeepsPrice() {
        assertThat(PriceCalculator.withDiscount(120000L, null)).isEqualTo(120000L);
        assertThat(PriceCalculator.withDiscount(120000L, 0)).isEqualTo(120000L);
    }

    @Test
    void discountIsAppliedAndRoundedHalfUp() {
        assertThat(PriceCalculator.withDiscount(120000L, 15)).isEqualTo(102000L);
        assertThat(PriceCalculator.withDiscount(9999L, 10)).isEqualTo(8999L);
        assertThat(PriceCalculator.withDiscount(125L, 10)).isEqualTo(113L);
    }

    @Test
    void fullDiscountGivesZero() {
        assertThat(PriceCalculator.withDiscount(5000L, 100)).isEqualTo(0L);
    }

    @Test
    void skuWithoutOwnPriceFallsBackToProductPricing() {
        Product product = new Product();
        product.setPriceCents(20000L);
        product.setDiscountPercent(50);

        ProductSku sku = new ProductSku();
        sku.setPriceCents(null);
        sku.setDiscountPercent(null);

        assertThat(PriceCalculator.effectiveSkuPriceWithDiscount(product, sku))
                .isEqualTo(10000L);
    }

    @Test
    void skuOwnPriceWithProductDiscount() {
        Product product = new Product();
        product.setPriceCents(20000L);
        product.setDiscountPercent(50);

        ProductSku sku = new ProductSku();
        sku.setPriceCents(30000L);

        assertThat(PriceCalculator.effectiveSkuPriceWithDiscount(product, sku))
                .isEqualTo(15000L);
    }

    @Test
    void skuOwnDiscountOverridesProductDiscount() {
        Product product = new Product();
        product.setPriceCents(20000L);
        product.setDiscountPercent(50);

        ProductSku sku = new ProductSku();
        sku.setPriceCents(30000L);
        sku.setDiscountPercent(10);

        assertThat(PriceCalculator.effectiveSkuPriceWithDiscount(product, sku))
                .isEqualTo(27000L);
    }
}
