package com.practice.catalog.order.service;

import com.practice.catalog.catalog.domain.PriceCalculator;
import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.common.events.DomainEventPublisher;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.exception.InsufficientStockException;
import com.practice.catalog.common.exception.UnprocessableEntityException;
import com.practice.catalog.order.domain.Cart;
import com.practice.catalog.order.domain.CartItem;
import com.practice.catalog.order.domain.CartItemRepository;
import com.practice.catalog.order.domain.Order;
import com.practice.catalog.order.domain.OrderItem;
import com.practice.catalog.order.domain.OrderItemRepository;
import com.practice.catalog.order.domain.OrderRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CheckoutService {

    private final CartService cartService;
    private final CartItemRepository cartItemRepository;
    private final com.practice.catalog.order.domain.CartRepository cartRepository;
    private final ProductSkuRepository skuRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DomainEventPublisher eventPublisher;

    public CheckoutService(CartService cartService,
                           CartItemRepository cartItemRepository,
                           com.practice.catalog.order.domain.CartRepository cartRepository,
                           ProductSkuRepository skuRepository,
                           ProductRepository productRepository,
                           OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           DomainEventPublisher eventPublisher) {
        this.cartService = cartService;
        this.cartItemRepository = cartItemRepository;
        this.cartRepository = cartRepository;
        this.skuRepository = skuRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public CheckoutResult checkout(UUID userId, CheckoutCommand cmd) {
        String requestId = normalizeRequestId(cmd.requestId());
        if (requestId != null) {
            Optional<Order> existing = orderRepository.findByRequestId(requestId);
            if (existing.isPresent()) {
                return new CheckoutResult(existing.get(), false);
            }
        }
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new UnprocessableEntityException("Cart is empty"));
        List<CartItem> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId());
        if (items.isEmpty()) {
            throw new UnprocessableEntityException("Cart is empty");
        }

        record Line(CartItem item, ProductSku sku, Product product, long discountedPrice) {
        }
        List<Line> lines = new ArrayList<>();
        for (CartItem item : items) {
            ProductSku sku = skuRepository.findById(item.getSkuId()).orElse(null);
            Product product = sku == null ? null :
                    productRepository.findByIdAndDeletedAtIsNull(sku.getProductId()).orElse(null);
            boolean available = sku != null && product != null
                    && sku.isActive() && product.isActive()
                    && sku.getStockQty() >= item.getQuantity();
            if (!available) {
                throw new UnprocessableEntityException("Cart contains unavailable items");
            }
            long discounted = PriceCalculator.effectiveSkuPriceWithDiscount(product, sku);
            lines.add(new Line(item, sku, product, discounted));
        }
        lines.sort(Comparator.comparing(line -> line.item().getSkuId()));

        List<InsufficientStockException.StockDeficiency> deficiencies = new ArrayList<>();
        for (Line line : lines) {
            if (line.sku().getStockQty() < line.item().getQuantity()) {
                deficiencies.add(new InsufficientStockException.StockDeficiency(
                        line.sku().getId(), line.item().getQuantity(), line.sku().getStockQty()));
            }
        }
        if (!deficiencies.isEmpty()) {
            throw new InsufficientStockException(deficiencies);
        }

        long itemsTotal = 0;
        for (Line line : lines) {
            int deducted = skuRepository.deductStock(
                    line.sku().getId(), line.item().getQuantity());
            if (deducted == 0) {
                throw new InsufficientStockException(List.of(
                        new InsufficientStockException.StockDeficiency(
                                line.sku().getId(), line.item().getQuantity(), line.sku().getStockQty())));
            }
            itemsTotal += line.discountedPrice() * line.item().getQuantity();
        }

        Order order = new Order();
        order.setNumber(formatNumber(orderRepository.nextOrderNumber()));
        order.setRequestId(requestId);
        order.setUserId(userId);
        order.setItemsTotalCents(itemsTotal);
        order.setDeliveryCents(0L);
        order.setTotalCents(itemsTotal);
        order.setCustomerName(cmd.customerName());
        order.setCustomerPhone(cmd.customerPhone());
        order.setDeliveryCity(cmd.deliveryCity());
        order.setDeliveryAddress(cmd.deliveryAddress());
        order.setComment(cmd.comment());
        order.applyStatus(com.practice.catalog.order.domain.OrderStatus.NEW, userId);
        order = orderRepository.save(order);

        for (Line line : lines) {
            orderItemRepository.save(OrderItem.snapshot(
                    order.getId(), line.sku().getId(),
                    line.product().getName(), line.sku().getName(), line.sku().getArticle(),
                    line.sku().getPriceCents() != null ? line.sku().getPriceCents() : line.product().getPriceCents(),
                    line.discountedPrice(), line.item().getQuantity()));
        }
        try {
            cartItemRepository.flush();
        } catch (DataIntegrityViolationException ignored) {
        }
        cartItemRepository.deleteByCartId(cart.getId());

        for (Line line : lines) {
            eventPublisher.publish(Topics.CATALOG, line.sku().getId().toString(),
                    Topics.STOCK_UPDATED, java.util.Map.of(
                            "skuId", line.sku().getId(),
                            "productId", line.product().getId(),
                            "stockQty", line.sku().getStockQty()));
        }
        eventPublisher.publish(Topics.ORDER, order.getId().toString(),
                Topics.ORDER_CREATED, java.util.Map.of(
                        "orderId", order.getId(),
                        "number", order.getNumber(),
                        "userId", userId,
                        "totalCents", order.getTotalCents()));

        return new CheckoutResult(order, true);
    }

    public record CheckoutResult(Order order, boolean created) {
    }

    private String formatNumber(long sequence) {
        int year = java.time.Year.now().getValue();
        return "ORD-%d-%06d".formatted(year, sequence % 1_000_000);
    }

    private String normalizeRequestId(String requestId) {
        return requestId == null || requestId.isBlank() ? null : requestId.trim();
    }

    public record CheckoutCommand(
            String customerName,
            String customerPhone,
            String deliveryCity,
            String deliveryAddress,
            String comment,
            String requestId) {

        public CheckoutCommand {
            if (customerName == null || customerName.length() < 2 || customerName.length() > 200) {
                throw new com.practice.catalog.common.exception.BadRequestException(
                        "customerName must be from 2 to 200 characters");
            }
            if (customerPhone == null || customerPhone.length() < 6 || customerPhone.length() > 30) {
                throw new com.practice.catalog.common.exception.BadRequestException(
                        "customerPhone must be from 6 to 30 characters");
            }
            if (deliveryCity == null || deliveryCity.isBlank() || deliveryCity.length() > 100) {
                throw new com.practice.catalog.common.exception.BadRequestException(
                        "deliveryCity is required, up to 100 characters");
            }
            if (deliveryAddress == null || deliveryAddress.isBlank() || deliveryAddress.length() > 300) {
                throw new com.practice.catalog.common.exception.BadRequestException(
                        "deliveryAddress is required, up to 300 characters");
            }
            if (comment != null && comment.length() > 1000) {
                throw new com.practice.catalog.common.exception.BadRequestException(
                        "comment up to 1000 characters");
            }
        }
    }
}
