package com.practice.catalog.catalog.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record ProductSummaryResponse(
        UUID id,
        String name,
        String article,
        String series,
        String productType,
        long priceCents,
        Integer discountPercent,
        long priceWithDiscountCents,
        String mainImageUrl,
        BigDecimal ratingAverage,
        int ratingCount,
        boolean inStock) {
}
