package com.practice.catalog.order.api;

import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.order.domain.Order;
import com.practice.catalog.order.domain.OrderItem;
import com.practice.catalog.order.domain.OrderStatus;
import com.practice.catalog.order.service.CheckoutService;
import com.practice.catalog.order.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final CheckoutService checkoutService;
    private final OrderService orderService;

    public OrderController(CheckoutService checkoutService, OrderService orderService) {
        this.checkoutService = checkoutService;
        this.orderService = orderService;
    }

    public record CreateOrderRequest(
            @NotBlank @Size(min = 2, max = 200) String customerName,
            @NotBlank @Size(min = 6, max = 30) String customerPhone,
            @NotBlank @Size(max = 100) String deliveryCity,
            @NotBlank @Size(max = 300) String deliveryAddress,
            @Size(max = 1000) String comment) {
    }

    public record OrderItemResponse(
            UUID id,
            UUID skuId,
            String productName,
            String skuName,
            String article,
            long priceCents,
            long priceWithDiscountCents,
            int quantity,
            long totalCents) {
    }

    public record OrderResponse(
            UUID id,
            String number,
            OrderStatus status,
            long itemsTotalCents,
            long deliveryCents,
            long totalCents,
            List<OrderItemResponse> items,
            Instant createdAt,
            List<Order.StatusEvent> statusHistory) {
    }

    @PostMapping
    public ResponseEntity<OrderResponse> checkout(
            @AuthenticationPrincipal UUID userId,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @Valid @RequestBody CreateOrderRequest request) {
        try {
            CheckoutService.CheckoutResult result = checkoutService.checkout(userId,
                    new CheckoutService.CheckoutCommand(
                            request.customerName(), request.customerPhone(),
                            request.deliveryCity(), request.deliveryAddress(), request.comment(),
                            requestId));
            return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                    .body(toResponse(result.order()));
        } catch (DataIntegrityViolationException e) {
            if (requestId == null || requestId.isBlank()) {
                throw e;
            }
            Order existing = orderService.findByRequestIdAndUser(requestId.trim(), userId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Order", requestId));
            return ResponseEntity.ok(toResponse(existing));
        }
    }

    @GetMapping
    public PageResponse<OrderResponse> list(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = orderService.listForUser(userId, page, size);
        List<OrderResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new PageResponse<>(items, result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @GetMapping("/{id}")
    public OrderResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return toResponse(orderService.getForUser(id, userId));
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return toResponse(orderService.cancelByUser(id, userId));
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItem> orderItems = orderService.items(order.getId());
        List<OrderItemResponse> items = orderItems.stream()
                .map(item -> new OrderItemResponse(item.getId(), item.getSkuId(),
                        item.getProductName(), item.getSkuName(), item.getArticle(),
                        item.getPriceCents(), item.getPriceWithDiscountCents(),
                        item.getQuantity(), item.getTotalCents()))
                .toList();
        return new OrderResponse(order.getId(), order.getNumber(), order.getStatus(),
                order.getItemsTotalCents(), order.getDeliveryCents(), order.getTotalCents(),
                items, order.getCreatedAt(), order.getStatusHistory());
    }
}
