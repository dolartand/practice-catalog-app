package com.practice.catalog.common.events;

import com.practice.catalog.common.web.RequestIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.UUID;

@Component
public class DomainEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DomainEventPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final JsonMapper mapper;

    public DomainEventPublisher(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
        this.mapper = JsonMapper.builder().build();
    }

    public void publish(String topic, String key, String eventType, Object payload) {
        EventEnvelope envelope = new EventEnvelope(
                UUID.randomUUID(), eventType, EventEnvelope.SOURCE,
                Instant.now(), RequestIdFilter.currentTraceId(), payload);
        String json = mapper.writeValueAsString(envelope);
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send(topic, key, json, envelope);
                }
            });
        } else {
            send(topic, key, json, envelope);
        }
    }

    private void send(String topic, String key, String json, EventEnvelope envelope) {
        kafkaTemplate.send(topic, key, json);
        log.info("Published event {} eventId={} key={}", envelope.eventType(),
                envelope.eventId(), key);
    }
}
