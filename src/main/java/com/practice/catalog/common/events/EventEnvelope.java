package com.practice.catalog.common.events;

import java.time.Instant;
import java.util.UUID;

public record EventEnvelope(
        UUID eventId,
        String eventType,
        String source,
        Instant occurredAt,
        String traceId,
        Object payload) {

    public static final String SOURCE = "practice-catalog-app";
}
