package com.practice.catalog.review.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByUserIdAndProductId(UUID userId, UUID productId);

    Optional<Review> findByIdAndUserId(UUID id, UUID userId);

    Page<Review> findByProductIdAndModeratedTrueOrderByCreatedAtDesc(UUID productId, Pageable pageable);

    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Review> findByModeratedOrderByCreatedAtDesc(boolean moderated, Pageable pageable);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.productId = :productId and r.moderated = true")
    Double averageRating(@Param("productId") UUID productId);

    @Query("select count(r) from Review r where r.productId = :productId and r.moderated = true")
    long countModerated(@Param("productId") UUID productId);
}
