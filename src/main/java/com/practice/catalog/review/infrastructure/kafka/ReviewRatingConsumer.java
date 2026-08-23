package com.practice.catalog.review.infrastructure.kafka;

import com.practice.catalog.common.events.EventEnvelope;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.kafka.EventConsumerSupport;
import com.practice.catalog.review.service.RatingAggregator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class ReviewRatingConsumer {

    private static final Logger log = LoggerFactory.getLogger(ReviewRatingConsumer.class);

    private final EventConsumerSupport support;
    private final RatingAggregator ratingAggregator;

    public ReviewRatingConsumer(EventConsumerSupport support, RatingAggregator ratingAggregator) {
        this.support = support;
        this.ratingAggregator = ratingAggregator;
    }

    @KafkaListener(topics = Topics.REVIEW, groupId = "review-rating",
            containerFactory = "kafkaListenerContainerFactory")
    public void onReviewEvent(String json) {
        EventEnvelope envelope = support.parse(json);
        if (!Topics.REVIEW_RATING_UPDATED.equals(envelope.eventType())) {
            return;
        }
        if (support.alreadyProcessed(EventConsumerSupport.CONSUMER_REVIEW_RATING, envelope)) {
            return;
        }
        Map<String, Object> payload = support.payloadMap(envelope);
        UUID productId = UUID.fromString(String.valueOf(payload.get("productId")));
        ratingAggregator.recalculate(productId);
        support.processOnce(EventConsumerSupport.CONSUMER_REVIEW_RATING, envelope,
                () -> log.info("Recalculated rating for product {} eventId={}",
                        productId, envelope.eventId()));
    }
}
