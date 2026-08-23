package com.practice.catalog.review.service;

import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.service.CatalogCache;
import com.practice.catalog.review.domain.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class RatingAggregator {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final CatalogCache catalogCache;

    public RatingAggregator(ReviewRepository reviewRepository,
                            ProductRepository productRepository,
                            CatalogCache catalogCache) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.catalogCache = catalogCache;
    }

    @Transactional
    public void recalculate(UUID productId) {
        Double average = reviewRepository.averageRating(productId);
        long count = reviewRepository.countModerated(productId);
        productRepository.findByIdAndDeletedAtIsNull(productId).ifPresent((Product product) -> {
            product.setRatingAverage(BigDecimal.valueOf(average == null ? 0d : average)
                    .setScale(1, RoundingMode.HALF_UP));
            product.setRatingCount((int) Math.min(count, Integer.MAX_VALUE));
            productRepository.save(product);
        });
        catalogCache.evictProduct(productId);
    }
}
