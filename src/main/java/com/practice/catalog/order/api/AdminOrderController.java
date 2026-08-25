package com.practice.catalog.order.api;

import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.order.domain.Order;
import com.practice.catalog.order.domain.OrderItem;
import com.practice.catalog.order.domain.OrderStatus;
import com.practice.catalog.order.service.OrderService;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    public record UpdateStatusRequest(@NotNull OrderStatus status) {
    }

    public record AdminOrderListItem(
            UUID id,
            String number,
            UUID userId,
            OrderStatus status,
            long itemsTotalCents,
            long deliveryCents,
            long totalCents,
            String customerName,
            String customerPhone,
            long itemCount,
            Instant createdAt) {
    }

    public record AdminOrderItemResponse(
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

    public record AdminOrderDetailResponse(
            UUID id,
            String number,
            UUID userId,
            OrderStatus status,
            long itemsTotalCents,
            long deliveryCents,
            long totalCents,
            String customerName,
            String customerPhone,
            String deliveryCity,
            String deliveryAddress,
            String comment,
            List<AdminOrderItemResponse> items,
            List<Order.StatusEvent> statusHistory,
            Instant createdAt) {
    }

    @GetMapping
    public PageResponse<AdminOrderListItem> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = orderService.listForAdmin(status, page, size);
        List<Order> orders = result.getContent();
        Map<UUID, Long> itemCounts = itemCountsByOrderId(orders);
        List<AdminOrderListItem> items = orders.stream()
                .map(order -> toListItem(order, itemCounts.getOrDefault(order.getId(), 0L)))
                .toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @GetMapping("/{id}")
    public AdminOrderDetailResponse get(@PathVariable UUID id) {
        return toDetail(orderService.getForAdmin(id));
    }

    @PatchMapping("/{id}/status")
    public AdminOrderDetailResponse changeStatus(@AuthenticationPrincipal UUID adminId,
                                                 @PathVariable UUID id,
                                                 @RequestBody UpdateStatusRequest request) {
        return toDetail(orderService.changeStatusByAdmin(id, request.status(), adminId));
    }

    private Map<UUID, Long> itemCountsByOrderId(List<Order> orders) {
        Map<UUID, Long> counts = new HashMap<>();
        if (orders.isEmpty()) {
            return counts;
        }
        List<UUID> orderIds = orders.stream().map(Order::getId).toList();
        for (var row : orderService.itemCounts(orderIds)) {
            counts.put(row.getOrderId(), row.getCount());
        }
        return counts;
    }

    private AdminOrderListItem toListItem(Order order, long itemCount) {
        return new AdminOrderListItem(order.getId(), order.getNumber(), order.getUserId(),
                order.getStatus(), order.getItemsTotalCents(), order.getDeliveryCents(),
                order.getTotalCents(), order.getCustomerName(), order.getCustomerPhone(),
                itemCount, order.getCreatedAt());
    }

    private AdminOrderDetailResponse toDetail(Order order) {
        List<OrderItem> orderItems = orderService.items(order.getId());
        List<AdminOrderItemResponse> items = orderItems.stream()
                .map(item -> new AdminOrderItemResponse(item.getId(), item.getSkuId(),
                        item.getProductName(), item.getSkuName(), item.getArticle(),
                        item.getPriceCents(), item.getPriceWithDiscountCents(),
                        item.getQuantity(), item.getTotalCents()))
                .toList();
        return new AdminOrderDetailResponse(order.getId(), order.getNumber(), order.getUserId(),
                order.getStatus(), order.getItemsTotalCents(), order.getDeliveryCents(),
                order.getTotalCents(), order.getCustomerName(), order.getCustomerPhone(),
                order.getDeliveryCity(), order.getDeliveryAddress(), order.getComment(),
                items, order.getStatusHistory(), order.getCreatedAt());
    }
}
