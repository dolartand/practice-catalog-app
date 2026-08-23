package com.practice.catalog.review.service;

import com.practice.catalog.auth.domain.UserRepository;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.common.events.DomainEventPublisher;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ForbiddenException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.order.domain.OrderRepository;
import com.practice.catalog.order.domain.OrderStatus;
import com.practice.catalog.review.domain.Review;
import com.practice.catalog.review.domain.ReviewRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final RatingAggregator ratingAggregator;
    private final UserRepository userRepository;
    private final DomainEventPublisher eventPublisher;

    public ReviewService(ReviewRepository reviewRepository,
                         OrderRepository orderRepository,
                         ProductRepository productRepository,
                         RatingAggregator ratingAggregator,
                         UserRepository userRepository,
                         DomainEventPublisher eventPublisher) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.ratingAggregator = ratingAggregator;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    private void publishRatingUpdated(UUID productId) {
        eventPublisher.publish(Topics.REVIEW, productId.toString(),
                Topics.REVIEW_RATING_UPDATED, java.util.Map.of("productId", productId));
    }


    @Transactional
    public ReviewData create(UUID userId, UUID productId, Integer rating, String text) {
        if (reviewRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new ConflictException("Review already exists for this product");
        }
        List<OrderRepository.DeliveredPurchase> purchases =
                orderRepository.findDeliveredPurchases(userId, productId, OrderStatus.DELIVERED);
        if (purchases.isEmpty()) {
            throw new ForbiddenException("Only buyers with a DELIVERED order can review this product");
        }
        productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> ResourceNotFoundException.of("Product", productId));

        Review review = new Review();
        review.setUserId(userId);
        review.setProductId(productId);
        review.setRating(rating.shortValue());
        review.setText(text);
        review.setPurchasedAt(purchases.get(0).orderedAt());
        review = reviewRepository.save(review);
        ratingAggregator.recalculate(productId);
        publishRatingUpdated(productId);
        return toData(review);
    }

    @Transactional
    public ReviewData update(UUID userId, UUID reviewId, Integer rating, String text) {
        Review review = ownReview(userId, reviewId);
        boolean ratingChanged = rating != null && rating != review.getRating();
        if (rating != null) {
            review.setRating(rating.shortValue());
        }
        if (text != null) {
            review.setText(text);
        }
        review = reviewRepository.save(review);
        if ((ratingChanged || text != null) && review.isModerated()) {
            ratingAggregator.recalculate(review.getProductId());
            publishRatingUpdated(review.getProductId());
        }
        return toData(review);
    }

    @Transactional
    public void delete(UUID userId, UUID reviewId) {
        Review review = ownReview(userId, reviewId);
        UUID productId = review.getProductId();
        boolean wasModerated = review.isModerated();
        reviewRepository.delete(review);
        reviewRepository.flush();
        if (wasModerated) {
            ratingAggregator.recalculate(productId);
            publishRatingUpdated(productId);
        }
    }

    @Transactional
    public ReviewData setModeration(UUID reviewId, boolean moderated) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ResourceNotFoundException.of("Review", reviewId));
        review.setModerated(moderated);
        review = reviewRepository.save(review);
        ratingAggregator.recalculate(review.getProductId());
        publishRatingUpdated(review.getProductId());
        return toData(review);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewView> publicList(UUID productId, int page, int size) {
        var result = reviewRepository.findByProductIdAndModeratedTrueOrderByCreatedAtDesc(
                productId, PageRequest.of(Math.max(page, 0), clamp(size)));
        List<UUID> userIds = result.getContent().stream().map(Review::getUserId).distinct().toList();
        var namesById = new java.util.HashMap<UUID, String>();
        for (UUID userId : userIds) {
            userRepository.findById(userId).ifPresent(user -> namesById.put(userId, user.getFirstName()));
        }
        List<ReviewView> items = result.getContent().stream()
                .map(review -> new ReviewView(review.getId(),
                        namesById.getOrDefault(review.getUserId(), null),
                        review.getRating(), review.getText(), review.getCreatedAt()))
                .toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminReviewView> adminList(Boolean moderated, int page, int size) {
        var result = moderated == null
                ? reviewRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), clamp(size)))
                : reviewRepository.findByModeratedOrderByCreatedAtDesc(moderated,
                        PageRequest.of(Math.max(page, 0), clamp(size)));
        List<AdminReviewView> items = result.getContent().stream()
                .map(this::toAdminView)
                .toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    private AdminReviewView toAdminView(Review review) {
        return new AdminReviewView(review.getId(), review.getUserId(), review.getProductId(),
                review.getRating(), review.getText(), review.isModerated(), review.getCreatedAt());
    }

    private Review ownReview(UUID userId, UUID reviewId) {
        return reviewRepository.findByIdAndUserId(reviewId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Review", reviewId));
    }

    private int clamp(int size) {
        return Math.min(Math.max(size, 1), 100);
    }

    public record ReviewView(UUID id, String userFirstName, int rating, String text,
                             java.time.Instant createdAt) {
    }

    public record ReviewData(UUID id, UUID productId, int rating, String text,
                             boolean moderated, java.time.Instant createdAt) {
    }

    public record AdminReviewView(UUID id, UUID userId, UUID productId, int rating,
                                  String text, boolean moderated, java.time.Instant createdAt) {
    }

    private ReviewData toData(Review review) {
        return new ReviewData(review.getId(), review.getProductId(), review.getRating(),
                review.getText(), review.isModerated(), review.getCreatedAt());
    }
}
