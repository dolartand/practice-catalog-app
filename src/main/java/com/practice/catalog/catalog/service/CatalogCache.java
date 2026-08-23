package com.practice.catalog.catalog.service;

import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class CatalogCache {

    public static final String NEGATIVE = "__NEGATIVE__";
    public static final Duration POSITIVE_TTL = Duration.ofMinutes(5);
    public static final Duration NEGATIVE_TTL = Duration.ofSeconds(60);

    private static final Logger log = LoggerFactory.getLogger(CatalogCache.class);
    public static final String TREE_KEY = "catalog:categories:tree";
    public static final String LIST_PREFIX = "catalog:products:list:";
    public static final String PRODUCT_PREFIX = "catalog:product:";

    private final StringRedisTemplate redis;
    private final JsonMapper mapper;
    private final MeterRegistry meterRegistry;

    public CatalogCache(StringRedisTemplate redis, MeterRegistry meterRegistry) {
        this.redis = redis;
        this.meterRegistry = meterRegistry;
        this.mapper = JsonMapper.builder().build();
    }

    public <T> Optional<T> get(String key, Class<T> type, String kind) {
        return readValue(key, kind, raw -> mapper.readValue(raw, type));
    }

    public <T> Optional<List<T>> getList(String key, Class<T> elementType, String kind) {
        return readValue(key, kind, raw -> mapper.readValue(raw,
                mapper.getTypeFactory().constructCollectionType(List.class, elementType)));
    }

    private interface ValueReader<T> {
        T read(String raw);
    }

    private <T> Optional<T> readValue(String key, String kind, ValueReader<T> reader) {
        String raw = redis.opsForValue().get(key);
        if (raw == null) {
            meterRegistry.counter("catalog.cache.misses", "kind", kind).increment();
            return Optional.empty();
        }
        meterRegistry.counter("catalog.cache.hits", "kind", kind).increment();
        if (NEGATIVE.equals(raw)) {
            return Optional.empty();
        }
        try {
            return Optional.of(reader.read(raw));
        } catch (RuntimeException e) {
            log.warn("Failed to deserialize cached value for {}", key);
            redis.delete(key);
            return Optional.empty();
        }
    }

    public String computeEtag(Object value) {
        String json = toJson(value);
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(json.getBytes(StandardCharsets.UTF_8))).substring(0, 24);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public boolean isNegative(String key) {
        return NEGATIVE.equals(redis.opsForValue().get(key));
    }

    public void put(String key, Object value) {
        putInternal(key, toJson(value), POSITIVE_TTL);
    }

    public void putNegative(String key) {
        putInternal(key, NEGATIVE, NEGATIVE_TTL);
    }

    public void evictTree() {
        redis.delete(TREE_KEY);
    }

    public void evictProduct(UUID productId) {
        redis.delete(PRODUCT_PREFIX + productId);
        evictLists();
    }

    public void evictLists() {
        List<String> keys = scanByPrefix(LIST_PREFIX);
        if (!keys.isEmpty()) {
            redis.delete(keys);
        }
    }

    public void evictCategories() {
        evictTree();
        evictLists();
    }

    public boolean existsInRedis(String key) {
        return Boolean.TRUE.equals(redis.hasKey(key));
    }

    private void putInternal(String key, String json, Duration ttl) {
        try {
            redis.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            log.warn("Failed to write cache key {}", key);
        }
    }

    private String toJson(Object value) {
        return mapper.writeValueAsString(value);
    }

    private List<String> scanByPrefix(String prefix) {
        List<String> keys = new ArrayList<>();
        ScanOptions options = ScanOptions.scanOptions().match(prefix + "*").count(200).build();
        try (Cursor<String> cursor = redis.scan(options)) {
            while (cursor.hasNext()) {
                keys.add(cursor.next());
            }
        }
        return keys;
    }

    public static String listHash(String q, UUID categoryId, Long priceFrom, Long priceTo,
                                  String series, String type, String sort) {
        String canonical = String.join("|",
                nz(q), nz(categoryId), nz(priceFrom), nz(priceTo), nz(series), nz(type), nz(sort));
        return sha256(canonical).substring(0, 16);
    }

    private static String nz(Object value) {
        return value == null ? "" : value.toString().trim().toLowerCase();
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
