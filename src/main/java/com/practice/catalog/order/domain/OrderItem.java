package com.practice.catalog.order.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "sku_id")
    private UUID skuId;

    @Column(name = "product_name", nullable = false, length = 300)
    private String productName;

    @Column(name = "sku_name", nullable = false, length = 200)
    private String skuName;

    @Column(name = "article", nullable = false, length = 64)
    private String article;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(name = "price_with_discount_cents", nullable = false)
    private long priceWithDiscountCents;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    public static OrderItem snapshot(UUID orderId, UUID skuId, String productName, String skuName,
                                     String article, long priceCents, long priceWithDiscountCents, int quantity) {
        OrderItem item = new OrderItem();
        item.id = UUID.randomUUID();
        item.orderId = orderId;
        item.skuId = skuId;
        item.productName = productName;
        item.skuName = skuName;
        item.article = article;
        item.priceCents = priceCents;
        item.priceWithDiscountCents = priceWithDiscountCents;
        item.quantity = quantity;
        item.totalCents = priceWithDiscountCents * quantity;
        return item;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getSkuId() {
        return skuId;
    }

    public String getProductName() {
        return productName;
    }

    public String getSkuName() {
        return skuName;
    }

    public String getArticle() {
        return article;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public long getPriceWithDiscountCents() {
        return priceWithDiscountCents;
    }

    public int getQuantity() {
        return quantity;
    }

    public long getTotalCents() {
        return totalCents;
    }
}
