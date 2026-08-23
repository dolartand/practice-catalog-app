package com.practice.catalog.order.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByIdAndUserId(UUID id, UUID userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status, Pageable pageable);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<Order> findByRequestId(String requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);

    @Query(value = "select nextval('order_number_seq')", nativeQuery = true)
    long nextOrderNumber();

    @Query("""
            select new com.practice.catalog.order.domain.OrderRepository$DeliveredPurchase(
                o.id, oi.skuId, o.createdAt)
            from OrderItem oi join Order o on oi.orderId = o.id
            where o.userId = :userId and o.status = :delivered
              and exists (select 1 from ProductSku s
                          where s.id = oi.skuId and s.productId = :productId)
            order by o.createdAt desc
            """)
    List<DeliveredPurchase> findDeliveredPurchases(@Param("userId") UUID userId,
                                                   @Param("productId") UUID productId,
                                                   @Param("delivered") OrderStatus delivered);

    record DeliveredPurchase(UUID orderId, UUID skuId, java.time.Instant orderedAt) {
    }
}
