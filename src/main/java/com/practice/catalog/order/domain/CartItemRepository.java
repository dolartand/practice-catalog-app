package com.practice.catalog.order.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    List<CartItem> findByCartIdOrderByCreatedAtAsc(UUID cartId);

    Optional<CartItem> findByIdAndCartId(UUID id, UUID cartId);

    long countByCartId(UUID cartId);

    Optional<CartItem> findByCartIdAndSkuId(UUID cartId, UUID skuId);

    void deleteByCartId(UUID cartId);
}
