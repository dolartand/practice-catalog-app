package com.practice.catalog.catalog.domain;

import com.practice.catalog.common.domain.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "products")
@SQLRestriction("deleted_at IS NULL")
public class Product extends SoftDeletableEntity {

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Column(name = "article", nullable = false, length = 64)
    private String article;

    @Column(name = "description")
    private String description;

    @Column(name = "series", length = 200)
    private String series;

    @Column(name = "product_type", length = 100)
    private String productType;

    @Column(name = "decor", length = 200)
    private String decor;

    @Column(name = "material", length = 100)
    private String material;

    @Column(name = "capacity_ml")
    private Integer capacityMl;

    @Column(name = "weight_g")
    private Integer weightG;

    @Column(name = "dimensions", length = 100)
    private String dimensions;

    @Column(name = "country_of_origin", length = 100)
    private String countryOfOrigin;

    @Column(name = "barcode", length = 32)
    private String barcode;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(name = "price_with_discount_cents", nullable = false)
    private long priceWithDiscountCents;

    @Column(name = "rating_average", nullable = false, precision = 2, scale = 1)
    private BigDecimal ratingAverage = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount = 0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public void recalculatePrice() {
        this.priceWithDiscountCents = PriceCalculator.withDiscount(priceCents, discountPercent);
    }

    public UUID getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(UUID categoryId) {
        this.categoryId = categoryId;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSeries() {
        return series;
    }

    public void setSeries(String series) {
        this.series = series;
    }

    public String getProductType() {
        return productType;
    }

    public void setProductType(String productType) {
        this.productType = productType;
    }

    public String getDecor() {
        return decor;
    }

    public void setDecor(String decor) {
        this.decor = decor;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public Integer getCapacityMl() {
        return capacityMl;
    }

    public void setCapacityMl(Integer capacityMl) {
        this.capacityMl = capacityMl;
    }

    public Integer getWeightG() {
        return weightG;
    }

    public void setWeightG(Integer weightG) {
        this.weightG = weightG;
    }

    public String getDimensions() {
        return dimensions;
    }

    public void setDimensions(String dimensions) {
        this.dimensions = dimensions;
    }

    public String getCountryOfOrigin() {
        return countryOfOrigin;
    }

    public void setCountryOfOrigin(String countryOfOrigin) {
        this.countryOfOrigin = countryOfOrigin;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public void setPriceCents(long priceCents) {
        this.priceCents = priceCents;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public long getPriceWithDiscountCents() {
        return priceWithDiscountCents;
    }

    public void setPriceWithDiscountCents(long priceWithDiscountCents) {
        this.priceWithDiscountCents = priceWithDiscountCents;
    }

    public BigDecimal getRatingAverage() {
        return ratingAverage;
    }

    public void setRatingAverage(BigDecimal ratingAverage) {
        this.ratingAverage = ratingAverage;
    }

    public int getRatingCount() {
        return ratingCount;
    }

    public void setRatingCount(int ratingCount) {
        this.ratingCount = ratingCount;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
