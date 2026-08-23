package com.practice.catalog.common.kafka;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, UUID> {

    boolean existsByConsumerAndEventId(String consumer, UUID eventId);

    @Modifying
    @Query("delete from ProcessedEvent p where p.eventId = ?1 and p.consumer = ?2")
    int deleteMark(UUID eventId, String consumer);
}
