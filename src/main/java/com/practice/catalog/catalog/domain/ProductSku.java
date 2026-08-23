package com.practice.catalog.catalog.domain;

import com.practice.catalog.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "product_skus")
public class ProductSku extends BaseEntity {

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "article", nullable = false, length = 64)
    private String article;

    @Column(name = "price_cents")
    private Long priceCents;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(name = "price_with_discount_cents")
    private Long priceWithDiscountCents;

    @Column(name = "stock_qty", nullable = false)
    private int stockQty = 0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public void recalculatePrice(Product product) {
        if (priceCents == null) {
            this.priceWithDiscountCents = null;
            return;
        }
        this.priceWithDiscountCents =
                PriceCalculator.effectiveSkuPriceWithDiscount(product, this);
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getArticle() {
        return article;
    }

    public void setArticle(String article) {
        this.article = article;
    }

    public Long getPriceCents() {
        return priceCents;
    }

    public void setPriceCents(Long priceCents) {
        this.priceCents = priceCents;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public Long getPriceWithDiscountCents() {
        return priceWithDiscountCents;
    }

    public void setPriceWithDiscountCents(Long priceWithDiscountCents) {
        this.priceWithDiscountCents = priceWithDiscountCents;
    }

    public int getStockQty() {
        return stockQty;
    }

    public void setStockQty(int stockQty) {
        this.stockQty = stockQty;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
