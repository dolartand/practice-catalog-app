package com.practice.catalog.order.service;

import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.common.events.DomainEventPublisher;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ForbiddenException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.order.domain.Order;
import com.practice.catalog.order.domain.OrderItem;
import com.practice.catalog.order.domain.OrderItemRepository;
import com.practice.catalog.order.domain.OrderRepository;
import com.practice.catalog.order.domain.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class OrderService {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            OrderStatus.NEW, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED));

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductSkuRepository skuRepository;
    private final DomainEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        ProductSkuRepository skuRepository,
                        DomainEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.skuRepository = skuRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Order changeStatusByAdmin(UUID orderId, OrderStatus target, UUID adminId) {
        Order order = lock(orderId);
        if (order.getStatus() == target) {
            return order;
        }
        OrderStatus from = order.getStatus();
        ensureTransitionAllowed(from, target);
        applyTransition(order, target, adminId);
        Order saved = orderRepository.save(order);
        eventPublisher.publish(Topics.ORDER, saved.getId().toString(),
                Topics.ORDER_STATUS_CHANGED, java.util.Map.of(
                        "orderId", saved.getId(),
                        "number", saved.getNumber(),
                        "from", from.name(),
                        "to", target.name(),
                        "changedBy", adminId));
        return saved;
    }

    @Transactional
    public Order cancelByUser(UUID orderId, UUID userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
        if (order.getStatus() != OrderStatus.NEW) {
            throw new ConflictException("Only orders in NEW status can be cancelled");
        }
        return changeStatusByAdmin(orderId, OrderStatus.CANCELLED, userId);
    }

    @Transactional(readOnly = true)
    public Order getForUser(UUID orderId, UUID userId) {
        return orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
    }

    @Transactional(readOnly = true)
    public java.util.Optional<Order> findByRequestIdAndUser(String requestId, UUID userId) {
        return orderRepository.findByRequestId(requestId)
                .filter(order -> order.getUserId().equals(userId));
    }

    @Transactional(readOnly = true)
    public Page<Order> listForUser(UUID userId, int page, int size) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId,
                PageRequest.of(Math.max(page, 0), clamp(size)));
    }

    @Transactional(readOnly = true)
    public Page<Order> listForAdmin(OrderStatus status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), clamp(size));
        return status == null
                ? orderRepository.findAllByOrderByCreatedAtDesc(pageRequest)
                : orderRepository.findByStatusOrderByCreatedAtDesc(status, pageRequest);
    }

    @Transactional(readOnly = true)
    public List<OrderItem> items(UUID orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    private Order lock(UUID orderId) {
        return orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));
    }

    private void ensureTransitionAllowed(OrderStatus current, OrderStatus target) {
        Set<OrderStatus> allowed = ALLOWED.get(current);
        if (allowed == null || !allowed.contains(target)) {
            throw new ConflictException(
                    "Invalid status transition: " + current + " -> " + target);
        }
    }

    private void applyTransition(Order order, OrderStatus target, UUID actorId) {
        if (target == OrderStatus.CANCELLED) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId()).stream()
                    .sorted(Comparator.comparing(OrderItem::getSkuId,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            for (OrderItem item : items) {
                if (item.getSkuId() == null) {
                    continue;
                }
                skuRepository.restoreStock(item.getSkuId(), item.getQuantity());
            }
        }
        order.applyStatus(target, actorId);
    }

    private int clamp(int size) {
        return Math.min(Math.max(size, 1), 100);
    }
}
