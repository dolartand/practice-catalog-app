package com.practice.catalog.order.infrastructure.kafka;

import com.practice.catalog.common.events.EventEnvelope;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.kafka.EventConsumerSupport;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderSinkConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderSinkConsumer.class);

    private final EventConsumerSupport support;
    private final MeterRegistry meterRegistry;

    public OrderSinkConsumer(EventConsumerSupport support, MeterRegistry meterRegistry) {
        this.support = support;
        this.meterRegistry = meterRegistry;
    }

    @KafkaListener(topics = Topics.ORDER, groupId = "order-sink",
            containerFactory = "kafkaListenerContainerFactory")
    public void onOrderEvent(String json) {
        EventEnvelope envelope = support.parse(json);
        if (!Topics.ORDER_CREATED.equals(envelope.eventType())
                && !Topics.ORDER_STATUS_CHANGED.equals(envelope.eventType())) {
            return;
        }
        if (support.alreadyProcessed(EventConsumerSupport.CONSUMER_ORDER_SINK, envelope)) {
            return;
        }
        meterRegistry.counter("order.sink.received", "type", envelope.eventType()).increment();
        support.processOnce(EventConsumerSupport.CONSUMER_ORDER_SINK, envelope,
                () -> log.info("Order sink received {} eventId={} traceId={}",
                        envelope.eventType(), envelope.eventId(), envelope.traceId()));
    }
}
