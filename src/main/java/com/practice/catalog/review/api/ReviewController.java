package com.practice.catalog.review.api;

import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.common.exception.ForbiddenException;
import com.practice.catalog.review.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    public record CreateReviewRequest(
            @NotNull @Min(1) @Max(5) Integer rating,
            @Size(min = 1, max = 2000) String text) {
    }

    public record UpdateReviewRequest(
            @Min(1) @Max(5) Integer rating,
            @Size(min = 1, max = 2000) String text) {
    }

    public record ReviewResponse(
            UUID id,
            UUID productId,
            int rating,
            String text,
            boolean moderated,
            java.time.Instant createdAt) {
    }

    public record PublicReviewResponse(
            UUID id,
            String userFirstName,
            int rating,
            String text,
            java.time.Instant createdAt) {
    }

    public record ModerationRequest(@NotNull Boolean isModerated) {
    }

    @PostMapping("/api/v1/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> create(@AuthenticationPrincipal UUID userId,
                                                 @PathVariable UUID productId,
                                                 @Valid @RequestBody CreateReviewRequest request) {
        try {
            var review = reviewService.create(userId, productId,
                    request.rating(), request.text());
            URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/reviews/{id}").buildAndExpand(review.id()).toUri();
            return ResponseEntity.created(location).body(toData(review));
        } catch (DataIntegrityViolationException e) {
            throw new ForbiddenException("Only buyers with a DELIVERED order can review this product");
        }
    }

    @GetMapping("/api/v1/products/{productId}/reviews")
    public PageResponse<PublicReviewResponse> publicList(
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse<ReviewService.ReviewView> views =
                reviewService.publicList(productId, page, size);
        return new PageResponse<>(views.items().stream()
                .map(v -> new PublicReviewResponse(v.id(), v.userFirstName(),
                        v.rating(), v.text(), v.createdAt()))
                .toList(), views.page(), views.size(), views.total(), views.totalPages());
    }

    @PatchMapping("/api/v1/reviews/{id}")
    public ReviewResponse update(@AuthenticationPrincipal UUID userId,
                                 @PathVariable UUID id,
                                 @Valid @RequestBody UpdateReviewRequest request) {
        return toData(reviewService.update(userId, id, request.rating(), request.text()));
    }

    @DeleteMapping("/api/v1/reviews/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UUID userId,
                                       @PathVariable UUID id) {
        reviewService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<ReviewService.AdminReviewView> adminList(
            @RequestParam(name = "isModerated", required = false) Boolean moderated,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return reviewService.adminList(moderated, page, size);
    }

    @PatchMapping("/api/v1/admin/reviews/{id}/moderation")
    @PreAuthorize("hasRole('ADMIN')")
    public ReviewResponse moderate(@PathVariable UUID id,
                                   @Valid @RequestBody ModerationRequest request) {
        return toData(reviewService.setModeration(id, request.isModerated()));
    }

    private ReviewResponse toData(ReviewService.ReviewData data) {
        return new ReviewResponse(data.id(), data.productId(), data.rating(),
                data.text(), data.moderated(), data.createdAt());
    }
}
