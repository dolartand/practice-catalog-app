package com.practice.catalog.order.api;

import com.practice.catalog.catalog.api.dto.ProductSummaryResponse;
import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.order.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PutMapping("/{productId}")
    public ResponseEntity<Void> add(@AuthenticationPrincipal UUID userId,
                                    @PathVariable UUID productId) {
        favoriteService.add(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal UUID userId,
                                       @PathVariable UUID productId) {
        favoriteService.remove(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public PageResponse<ProductSummaryResponse> list(@AuthenticationPrincipal UUID userId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        return favoriteService.list(userId, page, size);
    }
}
