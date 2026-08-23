package com.practice.catalog.common.events;

public final class Topics {

    public static final String CATALOG = "catalog.events";
    public static final String ORDER = "order.events";
    public static final String REVIEW = "review.events";

    public static final String PRODUCT_CREATED = "product.created.v1";
    public static final String PRODUCT_UPDATED = "product.updated.v1";
    public static final String STOCK_UPDATED = "stock.updated.v1";
    public static final String ORDER_CREATED = "order.created.v1";
    public static final String ORDER_STATUS_CHANGED = "order.status.changed.v1";
    public static final String REVIEW_RATING_UPDATED = "review.rating.updated.v1";

    private Topics() {
    }
}
