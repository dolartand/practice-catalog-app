package com.practice.catalog.order.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    List<OrderItem> findByOrderId(UUID orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select oi from OrderItem oi where oi.orderId = :orderId")
    List<OrderItem> findByOrderIdForUpdate(@Param("orderId") UUID orderId);

    @Query("""
            select i.orderId as orderId, count(i) as count
            from OrderItem i where i.orderId in :orderIds group by i.orderId
            """)
    List<OrderItemCount> countByOrderIds(@Param("orderIds") Collection<UUID> orderIds);

    interface OrderItemCount {
        UUID getOrderId();

        long getCount();
    }
}
