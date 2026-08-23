package com.practice.catalog.testsupport;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

public abstract class TestcontainersBase {

    @SuppressWarnings("removal")
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("catalog")
            .withUsername("catalog")
            .withPassword("catalog");

    static final GenericContainer<?> MINIO = new GenericContainer<>("minio/minio:latest")
            .withCommand("server /data")
            .withEnv("MINIO_ROOT_USER", "minioadmin")
            .withEnv("MINIO_ROOT_PASSWORD", "minioadmin")
            .withExposedPorts(9000);

    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    public static final org.testcontainers.kafka.KafkaContainer KAFKA =
            new org.testcontainers.kafka.KafkaContainer("apache/kafka:3.8.0");

    public static final String MINIO_BUCKET = "catalog-images";

    static {
        POSTGRES.start();
        MINIO.start();
        REDIS.start();
        KAFKA.start();
        ensureBucket();
    }

    private static void ensureBucket() {
        try {
            MinioClient client = MinioClient.builder()
                    .endpoint("http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000))
                    .credentials("minioadmin", "minioadmin")
                    .build();
            if (!client.bucketExists(BucketExistsArgs.builder().bucket(MINIO_BUCKET).build())) {
                client.makeBucket(MakeBucketArgs.builder().bucket(MINIO_BUCKET).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to prepare MinIO bucket", e);
        }
    }

    @DynamicPropertySource
    static void containerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        registry.add("app.minio.endpoint",
                () -> "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000));
        registry.add("app.minio.public-base-url",
                () -> "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000));
        registry.add("app.minio.access-key", () -> "minioadmin");
        registry.add("app.minio.secret-key", () -> "minioadmin");
        registry.add("app.minio.bucket", () -> MINIO_BUCKET);
    }
}
