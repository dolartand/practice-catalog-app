package com.practice.catalog.common.kafka;

import com.practice.catalog.common.events.EventEnvelope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class EventConsumerSupport {

    public static final String CONSUMER_CATALOG_CACHE = "catalog-cache";
    public static final String CONSUMER_REVIEW_RATING = "review-rating";
    public static final String CONSUMER_ORDER_SINK = "order-sink";

    private static final Logger log = LoggerFactory.getLogger(EventConsumerSupport.class);

    private final ProcessedEventRepository processedEventRepository;
    private final JsonMapper mapper = JsonMapper.builder().build();

    public EventConsumerSupport(ProcessedEventRepository processedEventRepository) {
        this.processedEventRepository = processedEventRepository;
    }

    public EventEnvelope parse(String json) {
        return mapper.readValue(json, EventEnvelope.class);
    }

    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> payloadMap(EventEnvelope envelope) {
        Object payload = envelope.payload();
        if (payload instanceof java.util.Map<?, ?> map) {
            return (java.util.Map<String, Object>) map;
        }
        return mapper.convertValue(payload,
                mapper.getTypeFactory().constructMapType(java.util.Map.class, String.class, Object.class));
    }

    public boolean alreadyProcessed(String consumer, EventEnvelope envelope) {
        return processedEventRepository.existsByConsumerAndEventId(
                consumer, envelope.eventId());
    }

    public void processOnce(String consumer, EventEnvelope envelope, Runnable action) {
        if (alreadyProcessed(consumer, envelope)) {
            log.info("Skipping already processed event {} for {}",
                    envelope.eventId(), consumer);
            return;
        }
        action.run();
        try {
            processedEventRepository.save(ProcessedEvent.mark(envelope.eventId(), consumer));
        } catch (DataIntegrityViolationException e) {
            log.info("Concurrent duplicate event {} for {}", envelope.eventId(), consumer);
        }
    }
}
