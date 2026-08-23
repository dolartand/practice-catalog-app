package com.practice.catalog.order.service;

import com.practice.catalog.catalog.domain.PriceCalculator;
import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.InsufficientStockException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.common.exception.UnprocessableEntityException;
import com.practice.catalog.order.domain.Cart;
import com.practice.catalog.order.domain.CartItem;
import com.practice.catalog.order.domain.CartItemRepository;
import com.practice.catalog.order.domain.CartRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CartService {

    public static final int MAX_QUANTITY_PER_ITEM = 999;
    public static final int MAX_POSITIONS = 100;

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductSkuRepository skuRepository;
    private final ProductRepository productRepository;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       ProductSkuRepository skuRepository,
                       ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.skuRepository = skuRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse view(UUID userId) {
        return cartRepository.findByUserId(userId)
                .map(cart -> buildView(cart.getId()))
                .orElse(new CartResponse(List.of(), 0L, 0L));
    }

    @Transactional
    public CartResponse addItem(UUID userId, UUID skuId, int quantity) {
        if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            throw new BadRequestException(
                    "quantity must be between 1 and " + MAX_QUANTITY_PER_ITEM);
        }
        ResolvedSku resolved = resolveActiveSku(skuId);
        Cart cart = getOrCreateCart(userId);
        var existing = cartItemRepository.findByCartIdAndSkuId(cart.getId(), skuId);
        int newQuantity = existing.map(CartItem::getQuantity).orElse(0) + quantity;

        if (existing.isEmpty() && cartItemRepository.countByCartId(cart.getId()) >= MAX_POSITIONS) {
            throw new BadRequestException("Cart cannot contain more than " + MAX_POSITIONS + " positions");
        }
        ensureStock(resolved.sku(), newQuantity);

        CartItem item = existing.orElseGet(() -> {
            CartItem created = new CartItem();
            created.setCartId(cart.getId());
            created.setSkuId(skuId);
            return created;
        });
        item.setQuantity(newQuantity);
        cartItemRepository.save(item);
        return buildView(cart.getId());
    }

    @Transactional
    public CartResponse updateItem(UUID userId, UUID itemId, int quantity) {
        if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
            throw new BadRequestException(
                    "quantity must be between 1 and " + MAX_QUANTITY_PER_ITEM);
        }
        Cart cart = requireCart(userId);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("CartItem", itemId));
        ResolvedSku resolved = resolveExistingSku(item.getSkuId());
        ensureStock(resolved.sku(), quantity);
        item.setQuantity(quantity);
        cartItemRepository.save(item);
        return buildView(cart.getId());
    }

    @Transactional
    public CartResponse removeItem(UUID userId, UUID itemId) {
        Cart cart = requireCart(userId);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("CartItem", itemId));
        cartItemRepository.delete(item);
        return buildView(cart.getId());
    }

    @Transactional
    public Cart getOrCreateCart(UUID userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(Cart.create(userId)));
    }

    @Transactional(readOnly = true)
    public Cart requireCart(UUID userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Cart", userId));
    }

    private CartResponse buildView(UUID cartId) {
        List<CartItemRow> rows = new ArrayList<>();
        long itemsTotal = 0;
        for (CartItem item : cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)) {
            var skuOpt = skuRepository.findById(item.getSkuId());
            ProductSku sku = skuOpt.orElse(null);
            Product product = sku == null ? null :
                    productRepository.findByIdAndDeletedAtIsNull(sku.getProductId()).orElse(null);

            boolean skuInactive = sku == null || !sku.isActive();
            boolean productInactive = product == null || !product.isActive();
            boolean insufficient = sku != null && sku.getStockQty() < item.getQuantity();
            boolean available = !skuInactive && !productInactive && !insufficient;

            String reason = null;
            if (skuInactive || productInactive) {
                reason = "unavailable";
            } else if (insufficient) {
                reason = "insufficient-stock";
            }

            long priceCents;
            long discounted;
            if (available || (!skuInactive && !productInactive)) {
                priceCents = sku.getPriceCents() != null ? sku.getPriceCents() : product.getPriceCents();
                discounted = PriceCalculator.effectiveSkuPriceWithDiscount(product, sku);
            } else {
                priceCents = 0;
                discounted = 0;
            }
            if (available) {
                itemsTotal += discounted * item.getQuantity();
            }
            rows.add(new CartItemRow(item.getId(), item.getSkuId(),
                    product != null ? product.getName() : null,
                    sku != null ? sku.getName() : null,
                    sku != null ? sku.getArticle() : null,
                    item.getQuantity(), priceCents, discounted,
                    discounted * item.getQuantity(),
                    !available));
        }
        return new CartResponse(rows, itemsTotal, itemsTotal);
    }

    record ResolvedSku(ProductSku sku, Product product) {
    }

    private ResolvedSku resolveActiveSku(UUID skuId) {
        ProductSku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> ResourceNotFoundException.of("Sku", skuId));
        Product product = productRepository.findByIdAndDeletedAtIsNull(sku.getProductId())
                .orElseThrow(() -> ResourceNotFoundException.of("Product", sku.getProductId()));
        if (!sku.isActive() || !product.isActive()) {
            throw new ConflictException("Product or SKU is not active");
        }
        return new ResolvedSku(sku, product);
    }

    private ResolvedSku resolveExistingSku(UUID skuId) {
        ProductSku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> ResourceNotFoundException.of("Sku", skuId));
        Product product = productRepository.findByIdAndDeletedAtIsNull(sku.getProductId())
                .orElseThrow(() -> ResourceNotFoundException.of("Product", sku.getProductId()));
        return new ResolvedSku(sku, product);
    }

    private void ensureStock(ProductSku sku, int requestedQuantity) {
        if (requestedQuantity > sku.getStockQty()) {
            throw new InsufficientStockException(List.of(
                    new InsufficientStockException.StockDeficiency(sku.getId(), requestedQuantity, sku.getStockQty())));
        }
    }

    public record CartItemRow(
            UUID id,
            UUID skuId,
            String productName,
            String skuName,
            String article,
            int quantity,
            long priceCents,
            long priceWithDiscountCents,
            long totalCents,
            boolean unavailable) {
    }

    public record CartResponse(List<CartItemRow> items, long itemsTotalCents, long totalCents) {
    }
}
