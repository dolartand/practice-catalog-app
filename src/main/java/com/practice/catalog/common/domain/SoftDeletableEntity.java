package com.practice.catalog.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

import java.time.Instant;

@MappedSuperclass
public abstract class SoftDeletableEntity extends BaseEntity {

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void markDeleted() {
        this.deletedAt = Instant.now();
    }
}
