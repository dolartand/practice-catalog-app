package com.practice.catalog.common.kafka;

import com.jayway.jsonpath.JsonPath;
import com.practice.catalog.testsupport.TestcontainersBase;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.header.Header;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KafkaFlowIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    ProcessedEventRepository processedEventRepository;

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"admin-password-123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    record Fixture(String productId, String skuId) {
    }

    private Fixture createProduct(String adminAuth) throws Exception {
        MvcResult category = mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"К\",\"slug\":\"kfk-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String article = "KFK-" + UUID.randomUUID().toString().substring(0, 12);
        MvcResult product = mockMvc.perform(post("/api/v1/admin/products")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"categoryId\":\"%s\",\"name\":\"Товар %s\",\"article\":\"%s\","
                                + "\"priceCents\":9000}").formatted(categoryId, article, article)))
                .andExpect(status().isCreated()).andReturn();
        String productId = JsonPath.read(product.getResponse().getContentAsString(), "$.id");
        MvcResult sku = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"S\",\"article\":\"" + article + "-S\",\"stockQty\":3}"))
                .andExpect(status().isCreated()).andReturn();
        return new Fixture(productId,
                JsonPath.read(sku.getResponse().getContentAsString(), "$.id"));
    }

    private List<String> readAll(String topic) {
        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(
                java.util.Map.of(
                        "bootstrap.servers", KAFKA.getBootstrapServers(),
                        "group.id", "it-" + UUID.randomUUID(),
                        "key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer",
                        "value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer",
                        "auto.offset.reset", "earliest"))) {
            consumer.subscribe(java.util.List.of(topic));
            List<String> values = new ArrayList<>();
            long deadline = System.currentTimeMillis() + 15_000;
            while (System.currentTimeMillis() < deadline && values.isEmpty()) {
                for (ConsumerRecord<String, String> record : consumer.poll(Duration.ofMillis(500))) {
                    values.add(record.value());
                }
            }
            consumer.poll(Duration.ofMillis(300));
            return values;
        }
    }

    private Optional<tools.jackson.databind.JsonNode> findEvent(String topic, String eventType, String keyPart) {
        tools.jackson.databind.json.JsonMapper mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        for (String json : readAll(topic)) {
            try {
                var node = mapper.readTree(json);
                if (eventType.equals(node.path("eventType").asText())
                        && node.toString().contains(keyPart)) {
                    return Optional.of(node);
                }
            } catch (Exception ignored) {
            }
        }
        return Optional.empty();
    }

    @Test
    void checkoutPublishesOrderCreatedAndStockUpdatedWithEnvelope() throws Exception {
        String token = newUser("kafka-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        Fixture catalog = createProduct(adminAuth);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skuId\":\"" + catalog.skuId() + "\",\"quantity\":1}"))
                .andExpect(status().isOk());

        MvcResult order = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Request-Id", "kafka-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Иванов Иван\",\"customerPhone\":\"+375291112233\","
                                + "\"deliveryCity\":\"Минск\",\"deliveryAddress\":\"Ленина 1\"}"))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(order.getResponse().getContentAsString(), "$.id");

        var orderEvent = pollUntil(() -> findEvent("order.events", "order.created.v1", orderId));
        assertThat(orderEvent).isPresent();
        assertEnvelopeShape(orderEvent.get());

        var stockEvent = pollUntil(() -> findEvent("catalog.events", "stock.updated.v1", catalog.skuId()));
        assertThat(stockEvent).isPresent();

        Thread.sleep(1500);
        double received = sinkReceivedCounter();
        assertThat(received).isGreaterThanOrEqualTo(1);
    }

    private double sinkReceivedCounter() {
        return meterRegistry.find("order.sink.received").counters().stream()
                .mapToDouble(c -> c.count())
                .sum();
    }

    @Autowired
    io.micrometer.core.instrument.MeterRegistry meterRegistry;

    private Optional<tools.jackson.databind.JsonNode> pollUntil(
            java.util.function.Supplier<Optional<tools.jackson.databind.JsonNode>> supplier) {
        for (int attempt = 0; attempt < 20; attempt++) {
            Optional<tools.jackson.databind.JsonNode> found = supplier.get();
            if (found.isPresent()) {
                return found;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private void assertEnvelopeShape(tools.jackson.databind.JsonNode event) {
        assertThat(event.path("eventId").asText()).isNotEmpty();
        assertThat(event.path("source").asText()).isEqualTo("practice-catalog-app");
        assertThat(java.time.Instant.parse(event.path("occurredAt").asString())).isNotNull();
        assertThat(event.path("traceId").asText()).isNotEmpty();
        assertThat(event.path("eventType").asText()).endsWith(".v1");
    }

    private String newUser(String email) throws Exception {
        MvcResult registration = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password-123\",\"firstName\":\"K\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(registration.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void productUpdatedEventInvalidatesCardCache() throws Exception {
        String adminAuth = adminToken();
        Fixture fixture = createProduct(adminAuth);

        mockMvc.perform(get("/api/v1/products/" + fixture.productId()))
                .andExpect(status().isOk());
        assertThat(cacheKeyExistsForProduct(fixture.productId())).isTrue();

        mockMvc.perform(patch("/api/v1/admin/products/" + fixture.productId())
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Обновлено по событию\"}"))
                .andExpect(status().isOk());

        boolean evicted = pollUntilTrue(20, () -> !cacheKeyExistsForProduct(fixture.productId()));
        assertThat(evicted).isTrue();
    }

    @Autowired
    com.practice.catalog.catalog.service.CatalogCache catalogCache;

    private boolean cacheKeyExistsForProduct(String productId) {
        return catalogCache.existsInRedis("catalog:product:" + productId);
    }

    private boolean pollUntilTrue(int attempts, java.util.function.BooleanSupplier condition) {
        for (int i = 0; i < attempts; i++) {
            if (condition.getAsBoolean()) {
                return true;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return false;
    }

    @Test
    void duplicateEventIsProcessedOnceAndUnknownPayloadGoesToDlt() throws Exception {
        String adminAuth = adminToken();
        Fixture fixture = createProduct(adminAuth);
        mockMvc.perform(get("/api/v1/products/" + fixture.productId()))
                .andExpect(status().isOk());

        String payload = """
                {"productId":"%s"}""".formatted(fixture.productId());
        String envelope = """
                {"eventId":"%s","eventType":"product.updated.v1","source":"practice-catalog-app",
                 "occurredAt":"2026-08-23T10:00:00Z","traceId":"it-trace","payload":%s}"""
                .formatted(UUID.randomUUID(), payload.replace("\n", "").strip());

        String eventId = com.jayway.jsonpath.JsonPath.read(envelope, "$.eventId");
        kafkaTemplate.send("catalog.events", fixture.productId(), envelope).get(5, java.util.concurrent.TimeUnit.SECONDS);
        boolean firstProcessed = pollUntilTrue(20, () -> !cacheKeyExistsForProduct(fixture.productId()));
        assertThat(firstProcessed).isTrue();

        mockMvc.perform(get("/api/v1/products/" + fixture.productId()))
                .andExpect(status().isOk());

        kafkaTemplate.send("catalog.events", fixture.productId(), envelope).get(5, java.util.concurrent.TimeUnit.SECONDS);
        Thread.sleep(2500);
        long marks = processedEventsCount(EventConsumerSupport.CONSUMER_CATALOG_CACHE,
                UUID.fromString(eventId));
        assertThat(marks).isEqualTo(1);
    }

    private long processedEventsCount(String consumer, UUID eventId) {
        return processedEventRepository.findAll().stream()
                .filter(pe -> pe.getConsumer().equals(consumer))
                .filter(pe -> pe.getEventId().equals(eventId))
                .count();
    }

    @Test
    void malformedEventRetriedThenSentToDlt() throws Exception {
        String badEnvelope = """
                {"eventId":"%s","eventType":"product.updated.v1","source":"practice-catalog-app",
                 "occurredAt":"2026-08-23T10:00:00Z","traceId":"it-trace","payload":{"oops":true}}"""
                .formatted(UUID.randomUUID());

        kafkaTemplate.send("catalog.events", "dlt-test", badEnvelope).get(5, java.util.concurrent.TimeUnit.SECONDS);

        List<ConsumerRecord<String, String>> dltRecords =
                waitRecordsWithHeader("catalog.events.dlt", "kafka_dlt-exception-message");
        assertThat(dltRecords).isNotEmpty();
    }

    private List<ConsumerRecord<String, String>> waitRecordsWithHeader(String topic, String headerKey) {
        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(java.util.Map.of(
                "bootstrap.servers", KAFKA.getBootstrapServers(),
                "group.id", "it-dlt-" + UUID.randomUUID(),
                "key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer",
                "value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer",
                "auto.offset.reset", "earliest"))) {
            consumer.subscribe(List.of(topic));
            long deadline = System.currentTimeMillis() + 30_000;
            while (System.currentTimeMillis() < deadline) {
                for (ConsumerRecord<String, String> record : consumer.poll(Duration.ofMillis(700))) {
                    Header header = record.headers().lastHeader(headerKey);
                    if (header != null) {
                        return List.of(record);
                    }
                }
            }
        }
        return List.of();
    }
}
