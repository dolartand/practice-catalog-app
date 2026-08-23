package com.practice.catalog.order.domain;

import com.practice.catalog.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order extends BaseEntity {

    @Column(name = "number", nullable = false, length = 20)
    private String number;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrderStatus status = OrderStatus.NEW;

    @Column(name = "items_total_cents", nullable = false)
    private long itemsTotalCents;

    @Column(name = "delivery_cents", nullable = false)
    private long deliveryCents;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 30)
    private String customerPhone;

    @Column(name = "delivery_city", length = 100)
    private String deliveryCity;

    @Column(name = "delivery_address", length = 300)
    private String deliveryAddress;

    @Column(name = "comment")
    private String comment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "status_history", nullable = false)
    private List<StatusEvent> statusHistory = new ArrayList<>();

    public void applyStatus(OrderStatus newStatus, UUID actorId) {
        this.status = newStatus;
        if (this.statusHistory == null) {
            this.statusHistory = new ArrayList<>();
        }
        this.statusHistory.add(new StatusEvent(newStatus.name(), actorId, Instant.now().toString()));
    }

    public String getNumber() {
        return number;
    }

    public void setNumber(String number) {
        this.number = number;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public List<StatusEvent> getStatusHistory() {
        return statusHistory;
    }

    public long getItemsTotalCents() {
        return itemsTotalCents;
    }

    public void setItemsTotalCents(long itemsTotalCents) {
        this.itemsTotalCents = itemsTotalCents;
    }

    public long getDeliveryCents() {
        return deliveryCents;
    }

    public void setDeliveryCents(long deliveryCents) {
        this.deliveryCents = deliveryCents;
    }

    public long getTotalCents() {
        return totalCents;
    }

    public void setTotalCents(long totalCents) {
        this.totalCents = totalCents;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getDeliveryCity() {
        return deliveryCity;
    }

    public void setDeliveryCity(String deliveryCity) {
        this.deliveryCity = deliveryCity;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public record StatusEvent(String status, UUID byUserId, String at) {
    }
}
