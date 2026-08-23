package com.practice.catalog.catalog.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductSkuResponse(
        UUID id,
        String name,
        String article,
        Long priceCents,
        Long priceWithDiscountCents,
        Integer discountPercent,
        Integer stockQty,
        boolean isActive) {
}
