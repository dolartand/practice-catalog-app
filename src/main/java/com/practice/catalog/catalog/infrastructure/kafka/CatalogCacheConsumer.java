package com.practice.catalog.catalog.infrastructure.kafka;

import com.practice.catalog.catalog.service.CatalogCache;
import com.practice.catalog.common.events.EventEnvelope;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.kafka.EventConsumerSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class CatalogCacheConsumer {

    private static final Logger log = LoggerFactory.getLogger(CatalogCacheConsumer.class);

    private final EventConsumerSupport support;
    private final CatalogCache catalogCache;

    public CatalogCacheConsumer(EventConsumerSupport support, CatalogCache catalogCache) {
        this.support = support;
        this.catalogCache = catalogCache;
    }

    @KafkaListener(topics = Topics.CATALOG, groupId = "catalog-cache",
            containerFactory = "kafkaListenerContainerFactory")
    public void onCatalogEvent(String json) {
        EventEnvelope envelope = support.parse(json);
        if (!"product.created.v1".equals(envelope.eventType())
                && !"product.updated.v1".equals(envelope.eventType())
                && !"stock.updated.v1".equals(envelope.eventType())) {
            log.debug("Ignoring event {}", envelope.eventType());
            return;
        }
        if (support.alreadyProcessed(EventConsumerSupport.CONSUMER_CATALOG_CACHE, envelope)) {
            log.info("Skipping processed event {} eventId={}",
                    envelope.eventType(), envelope.eventId());
            return;
        }
        Map<String, Object> payload = support.payloadMap(envelope);
        switch (envelope.eventType()) {
            case Topics.PRODUCT_UPDATED -> {
                UUID productId = UUID.fromString(String.valueOf(payload.get("productId")));
                catalogCache.evictProduct(productId);
            }
            case Topics.PRODUCT_CREATED, Topics.STOCK_UPDATED -> catalogCache.evictLists();
            default -> log.debug("Unhandled event {}", envelope.eventType());
        }
        support.processOnce(EventConsumerSupport.CONSUMER_CATALOG_CACHE, envelope,
                () -> log.info("Invalidated cache for event {} eventId={}",
                        envelope.eventType(), envelope.eventId()));
    }
}
