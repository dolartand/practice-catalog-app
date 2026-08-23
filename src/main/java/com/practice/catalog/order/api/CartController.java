package com.practice.catalog.order.api;

import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.order.service.CartService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    public record AddCartItemRequest(
            @NotNull UUID skuId,
            @Min(1) @Max(999) int quantity) {
    }

    public record UpdateCartItemRequest(
            @Min(1) @Max(999) int quantity) {
    }

    @GetMapping
    public CartService.CartResponse view(@AuthenticationPrincipal UUID userId) {
        return cartService.view(userId);
    }

    @PostMapping("/items")
    public CartService.CartResponse add(@AuthenticationPrincipal UUID userId,
                                        @Valid @RequestBody AddCartItemRequest request) {
        return cartService.addItem(userId, request.skuId(), request.quantity());
    }

    @PatchMapping("/items/{id}")
    public CartService.CartResponse update(@AuthenticationPrincipal UUID userId,
                                           @PathVariable UUID id,
                                           @Valid @RequestBody UpdateCartItemRequest request) {
        return cartService.updateItem(userId, id, request.quantity());
    }

    @DeleteMapping("/items/{id}")
    public CartService.CartResponse remove(@AuthenticationPrincipal UUID userId,
                                           @PathVariable UUID id) {
        return cartService.removeItem(userId, id);
    }
}
