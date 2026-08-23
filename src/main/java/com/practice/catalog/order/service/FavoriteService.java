package com.practice.catalog.order.service;

import com.practice.catalog.catalog.service.ProductQueryService;
import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.catalog.api.dto.ProductSummaryResponse;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.order.domain.Favorite;
import com.practice.catalog.order.domain.FavoriteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final ProductQueryService productQueryService;
    private final com.practice.catalog.catalog.domain.ProductRepository productRepository;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           ProductQueryService productQueryService,
                           com.practice.catalog.catalog.domain.ProductRepository productRepository) {
        this.favoriteRepository = favoriteRepository;
        this.productQueryService = productQueryService;
        this.productRepository = productRepository;
    }

    @Transactional
    public void add(UUID userId, UUID productId) {
        productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> ResourceNotFoundException.of("Product", productId));
        if (favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            return;
        }
        favoriteRepository.save(Favorite.create(userId, productId));
    }

    @Transactional
    public void remove(UUID userId, UUID productId) {
        favoriteRepository.findByUserIdAndProductId(userId, productId)
                .ifPresent(favoriteRepository::delete);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> list(UUID userId, int page, int size) {
        Page<Favorite> favorites = favoriteRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        List<UUID> productIds = favorites.getContent().stream().map(Favorite::getProductId).toList();
        List<ProductSummaryResponse> summaries = productQueryService.summariesByIds(productIds);
        return new PageResponse<>(summaries, favorites.getNumber(), favorites.getSize(),
                favorites.getTotalElements(), favorites.getTotalPages());
    }
}
