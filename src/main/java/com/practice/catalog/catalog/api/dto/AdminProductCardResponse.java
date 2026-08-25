package com.practice.catalog.catalog.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record AdminProductCardResponse(
        UUID id,
        UUID categoryId,
        String name,
        String article,
        String description,
        String series,
        String productType,
        String decor,
        String material,
        Integer capacityMl,
        Integer weightG,
        String dimensions,
        String countryOfOrigin,
        String barcode,
        long priceCents,
        Integer discountPercent,
        long priceWithDiscountCents,
        BigDecimal ratingAverage,
        int ratingCount,
        boolean isActive,
        Instant deletedAt,
        List<ProductImageResponse> images,
        List<ProductSkuResponse> skus) {
}
