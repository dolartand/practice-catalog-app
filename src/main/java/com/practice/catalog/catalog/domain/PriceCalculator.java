package com.practice.catalog.catalog.domain;

public final class PriceCalculator {

    private PriceCalculator() {
    }

    public static long withDiscount(long priceCents, Integer discountPercent) {
        if (discountPercent == null || discountPercent <= 0) {
            return priceCents;
        }
        if (discountPercent >= 100) {
            return 0;
        }
        return Math.round(priceCents * (100L - discountPercent) / 100.0);
    }

    public static long effectiveSkuPriceWithDiscount(Product product, ProductSku sku) {
        long basePrice = sku.getPriceCents() != null ? sku.getPriceCents() : product.getPriceCents();
        Integer discount = sku.getDiscountPercent() != null
                ? sku.getDiscountPercent()
                : product.getDiscountPercent();
        return withDiscount(basePrice, discount);
    }
}
