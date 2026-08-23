package com.practice.catalog.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_images")
public class ProductImage {

    @Id
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "object_key", nullable = false, length = 500)
    private String objectKey;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "is_main", nullable = false)
    private boolean main = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static ProductImage create(UUID productId, String objectKey, String url,
                                      int position, boolean main) {
        ProductImage image = new ProductImage();
        image.id = UUID.randomUUID();
        image.productId = productId;
        image.objectKey = objectKey;
        image.url = url;
        image.position = position;
        image.main = main;
        return image;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getProductId() {
        return productId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public boolean isMain() {
        return main;
    }

    public void setMain(boolean main) {
        this.main = main;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
