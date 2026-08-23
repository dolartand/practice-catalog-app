package com.practice.catalog.order.domain;

import com.practice.catalog.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "carts")
public class Cart extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public static Cart create(UUID userId) {
        Cart cart = new Cart();
        cart.userId = userId;
        return cart;
    }

    public UUID getUserId() {
        return userId;
    }
}
