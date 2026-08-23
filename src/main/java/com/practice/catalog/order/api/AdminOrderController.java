package com.practice.catalog.order.api;

import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.order.domain.Order;
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

import java.util.List;
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

    public record AdminOrderResponse(
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
            java.time.Instant createdAt) {
    }

    @GetMapping
    public PageResponse<AdminOrderResponse> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = orderService.listForAdmin(status, page, size);
        List<AdminOrderResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @PatchMapping("/{id}/status")
    public AdminOrderResponse changeStatus(@AuthenticationPrincipal UUID adminId,
                                           @PathVariable UUID id,
                                           @RequestBody UpdateStatusRequest request) {
        return toResponse(orderService.changeStatusByAdmin(id, request.status(), adminId));
    }

    private AdminOrderResponse toResponse(Order order) {
        return new AdminOrderResponse(order.getId(), order.getNumber(), order.getUserId(),
                order.getStatus(), order.getItemsTotalCents(), order.getDeliveryCents(),
                order.getTotalCents(), order.getCustomerName(), order.getCustomerPhone(),
                order.getDeliveryCity(), order.getDeliveryAddress(), order.getComment(),
                order.getCreatedAt());
    }
}
