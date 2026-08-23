package com.practice.catalog.order.domain;

import com.practice.catalog.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "cart_items")
public class CartItem extends BaseEntity {

    @Column(name = "cart_id", nullable = false)
    private UUID cartId;

    @Column(name = "sku_id", nullable = false)
    private UUID skuId;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    public UUID getCartId() {
        return cartId;
    }

    public void setCartId(UUID cartId) {
        this.cartId = cartId;
    }

    public UUID getSkuId() {
        return skuId;
    }

    public void setSkuId(UUID skuId) {
        this.skuId = skuId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
