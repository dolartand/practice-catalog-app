package com.practice.catalog.catalog.infrastructure;

import com.practice.catalog.common.exception.BadRequestException;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class MediaStorage {

    private static final Logger log = LoggerFactory.getLogger(MediaStorage.class);
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp");

    private final MinioClient minioClient;
    private final MinioProperties props;

    public MediaStorage(MinioClient minioClient, MinioProperties props) {
        this.minioClient = minioClient;
        this.props = props;
    }

    public StoredObject upload(UUID productId, String originalFilename, byte[] content) {
        String extension = resolveExtension(originalFilename);
        String objectKey = "products/" + productId + "/" + UUID.randomUUID() + "." + extension;
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(props.bucket())
                    .object(objectKey)
                    .contentType(CONTENT_TYPES.get(extension))
                    .stream(new ByteArrayInputStream(content), (long) content.length, -1L)
                    .build());
        } catch (Exception e) {
            throw new BadRequestException("Failed to store image");
        }
        return new StoredObject(objectKey, publicUrl(objectKey));
    }

    public void delete(String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(props.bucket())
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            log.error("Failed to delete object {}", objectKey, e);
        }
    }

    public String publicUrl(String objectKey) {
        String base = props.publicBaseUrl() != null ? props.publicBaseUrl() : props.endpoint();
        return base + "/" + props.bucket() + "/" + objectKey;
    }

    private String resolveExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new BadRequestException("Unsupported image format");
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!CONTENT_TYPES.containsKey(ext)) {
            throw new BadRequestException("Unsupported image format: " + ext);
        }
        return ext.equals("jpeg") ? "jpg" : ext;
    }

    public record StoredObject(String objectKey, String url) {
    }
}
