package com.practice.catalog.catalog.service;

import org.springframework.data.domain.Sort;

public enum ProductSort {

    PRICE_ASC(Sort.by(Sort.Direction.ASC, "priceWithDiscountCents")),
    PRICE_DESC(Sort.by(Sort.Direction.DESC, "priceWithDiscountCents")),
    RATING_DESC(Sort.by(Sort.Direction.DESC, "ratingAverage")),
    NEWEST(Sort.by(Sort.Direction.DESC, "createdAt")),
    DISCOUNT_DESC(Sort.by(Sort.Order.desc("discountPercent").with(Sort.NullHandling.NULLS_LAST)));

    private final Sort sort;

    ProductSort(Sort sort) {
        this.sort = sort;
    }

    public Sort toSort() {
        return sort;
    }

    public static ProductSort fromValue(String value) {
        if (value == null || value.isBlank()) {
            return NEWEST;
        }
        try {
            return valueOf(value.toUpperCase().replace('-', '_'));
        } catch (IllegalArgumentException e) {
            throw new com.practice.catalog.common.exception.BadRequestException("Unknown sort: " + value);
        }
    }
}
