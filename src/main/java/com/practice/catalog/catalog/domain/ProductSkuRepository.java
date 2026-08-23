package com.practice.catalog.catalog.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductSkuRepository extends JpaRepository<ProductSku, UUID> {

    boolean existsByArticle(String article);

    List<ProductSku> findByProductIdOrderByCreatedAtAsc(UUID productId);

    Optional<ProductSku> findByIdAndProductId(UUID id, UUID productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ProductSku s where s.id = :id")
    Optional<ProductSku> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query("update ProductSku s set s.stockQty = s.stockQty - :qty where s.id = :id and s.stockQty >= :qty")
    int deductStock(@Param("id") UUID id, @Param("qty") int qty);

    @Modifying
    @Query("update ProductSku s set s.stockQty = s.stockQty + :qty where s.id = :id")
    int restoreStock(@Param("id") UUID id, @Param("qty") int qty);
}
