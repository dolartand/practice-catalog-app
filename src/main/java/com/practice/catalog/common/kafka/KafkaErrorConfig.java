package com.practice.catalog.common.kafka;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;


@Configuration
public class KafkaErrorConfig {

    @Bean
    public DeadLetterPublishingRecoverer deadLetterPublishingRecoverer(
            KafkaOperations<String, String> template) {
        return new DeadLetterPublishingRecoverer(template,
                (record, ex) -> new org.apache.kafka.common.TopicPartition(
                        record.topic() + ".dlt", 0));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            DeadLetterPublishingRecoverer recoverer,
            @Value("${app.kafka.retry.initial-ms:500}") long initialMs,
            @Value("${app.kafka.retry.multiplier:2.0}") double multiplier,
            @Value("${app.kafka.retry.max-interval-ms:10000}") long maxIntervalMs,
            @Value("${app.kafka.retry.max-elapsed-ms:20000}") long maxElapsedTimeMs) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        ExponentialBackOff backoff = new ExponentialBackOff(initialMs, multiplier);
        backoff.setMaxInterval(maxIntervalMs);
        backoff.setMaxElapsedTime(maxElapsedTimeMs);
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, backoff);
        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }
}
