package com.practice.catalog.order.service;

import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.InsufficientStockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CartServiceTest {

    @Mock
    com.practice.catalog.order.domain.CartRepository cartRepository;
    @Mock
    com.practice.catalog.order.domain.CartItemRepository cartItemRepository;
    @Mock
    ProductSkuRepository skuRepository;
    @Mock
    ProductRepository productRepository;

    CartService cartService;

    final UUID userId = UUID.randomUUID();
    final UUID cartId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        cartService = new CartService(cartRepository, cartItemRepository, skuRepository, productRepository);
        var cart = com.practice.catalog.order.domain.Cart.create(userId);
        org.springframework.test.util.ReflectionTestUtils.setField(cart, "id", cartId);
        org.mockito.Mockito.lenient()
                .when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
    }

    private ProductSku activeSku(int stockQty) {
        ProductSku sku = new ProductSku();
        org.springframework.test.util.ReflectionTestUtils.setField(sku, "id", UUID.randomUUID());
        if (linkedProduct != null) {
            sku.setProductId(linkedProduct.getId());
        }
        sku.setName("На 6 персон");
        sku.setArticle("A-1");
        sku.setStockQty(stockQty);
        sku.setActive(true);
        return sku;
    }

    private Product linkedProduct;

    private Product activeProduct() {
        Product p = new Product();
        org.springframework.test.util.ReflectionTestUtils.setField(p, "id", UUID.randomUUID());
        p.setName("Сервиз");
        p.setPriceCents(10000L);
        p.setDiscountPercent(10);
        p.setActive(true);
        this.linkedProduct = p;
        return p;
    }

    private void mockEmptyCart() {
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of());
        when(cartItemRepository.countByCartId(cartId)).thenReturn(0L);
        when(cartItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void addItemRejectsQuantityOverLimit() {
        ProductSku sku = activeSku(5000);

        assertThatThrownBy(() -> cartService.addItem(userId, sku.getId(), 1000))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void addItemRejectsInactiveSku() {
        Product product = activeProduct();
        ProductSku sku = activeSku(100);
        sku.setActive(false);
        when(skuRepository.findById(sku.getId())).thenReturn(Optional.of(sku));
        when(productRepository.findByIdAndDeletedAtIsNull(product.getId()))
                .thenReturn(Optional.of(product));

        assertThatThrownBy(() -> cartService.addItem(userId, sku.getId(), 1))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void addItemRejectsWhenStockExceeded() {
        ProductSku sku = activeSku(5);
        when(skuRepository.findById(sku.getId())).thenReturn(Optional.of(sku));
        when(productRepository.findByIdAndDeletedAtIsNull(sku.getProductId()))
                .thenReturn(Optional.of(activeProduct()));
        when(cartItemRepository.findByCartIdAndSkuId(cartId, sku.getId())).thenReturn(Optional.empty());
        mockEmptyCart();

        assertThatThrownBy(() -> cartService.addItem(userId, sku.getId(), 6))
                .isInstanceOf(InsufficientStockException.class);
    }

    @Test
    void viewMarksUnavailableAndExcludesFromTotals() {
        Product product = activeProduct();
        ProductSku okSku = activeSku(50);
        ProductSku deadSku = activeSku(0);
        deadSku.setActive(false);

        var okItem = item(okSku.getId(), 2);
        var deadItem = item(deadSku.getId(), 1);
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId))
                .thenReturn(List.of(deadItem, okItem));
        when(skuRepository.findById(okSku.getId())).thenReturn(Optional.of(okSku));
        when(skuRepository.findById(deadSku.getId())).thenReturn(Optional.of(deadSku));
        when(productRepository.findByIdAndDeletedAtIsNull(product.getId()))
                .thenReturn(Optional.of(product));

        CartService.CartResponse response = cartService.view(userId);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).unavailable()).isTrue();
        assertThat(response.items().get(1).unavailable()).isFalse();
        assertThat(response.itemsTotalCents()).isEqualTo(9000L * 2);
    }

    private com.practice.catalog.order.domain.CartItem item(UUID skuId, int quantity) {
        var ci = new com.practice.catalog.order.domain.CartItem();
        org.springframework.test.util.ReflectionTestUtils.setField(ci, "id", UUID.randomUUID());
        ci.setCartId(cartId);
        ci.setSkuId(skuId);
        ci.setQuantity(quantity);
        return ci;
    }
}
