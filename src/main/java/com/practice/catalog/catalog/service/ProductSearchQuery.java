package com.practice.catalog.catalog.service;

import java.util.UUID;

public record ProductSearchQuery(
        String q,
        UUID categoryId,
        Long priceFromCents,
        Long priceToCents,
        String series,
        String type,
        boolean inStock,
        boolean onlyDiscounted,
        boolean includeInactive,
        ProductSort sort,
        int page,
        int size) {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_PAGE_SIZE = 20;
}
