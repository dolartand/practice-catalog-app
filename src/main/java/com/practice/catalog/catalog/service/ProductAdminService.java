package com.practice.catalog.catalog.service;

import com.practice.catalog.catalog.api.dto.ProductImageResponse;
import com.practice.catalog.catalog.domain.PriceCalculator;
import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductImage;
import com.practice.catalog.catalog.domain.ProductImageRepository;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.catalog.infrastructure.MediaStorage;
import com.practice.catalog.common.events.DomainEventPublisher;
import com.practice.catalog.common.events.Topics;
import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ProductAdminService {

    private final ProductRepository productRepository;
    private final ProductSkuRepository skuRepository;
    private final ProductImageRepository imageRepository;
    private final CategoryService categoryService;
    private final MediaStorage mediaStorage;
    private final CatalogCache catalogCache;
    private final DomainEventPublisher eventPublisher;

    public ProductAdminService(ProductRepository productRepository,
                               ProductSkuRepository skuRepository,
                               ProductImageRepository imageRepository,
                               CategoryService categoryService,
                               MediaStorage mediaStorage,
                               CatalogCache catalogCache,
                               DomainEventPublisher eventPublisher) {
        this.productRepository = productRepository;
        this.skuRepository = skuRepository;
        this.imageRepository = imageRepository;
        this.categoryService = categoryService;
        this.mediaStorage = mediaStorage;
        this.catalogCache = catalogCache;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Product createProduct(CreateProductCommand cmd) {
        categoryService.findActive(cmd.categoryId());
        if (productRepository.existsByArticleAndDeletedAtIsNull(cmd.article())) {
            throw new ConflictException("Product article already exists: " + cmd.article());
        }
        Product product = new Product();
        applyProduct(product, cmd);
        product.setArticle(cmd.article());
        product.setCategoryId(cmd.categoryId());
        product.recalculatePrice();
        Product saved = productRepository.save(product);
        catalogCache.evictLists();
        eventPublisher.publish(Topics.CATALOG, saved.getId().toString(),
                Topics.PRODUCT_CREATED, java.util.Map.of("productId", saved.getId()));
        return saved;
    }

    @Transactional
    public Product updateProduct(UUID id, UpdateProductCommand cmd) {
        Product product = findActive(id);
        if (cmd.categoryId() != null && !cmd.categoryId().equals(product.getCategoryId())) {
            categoryService.findActive(cmd.categoryId());
            product.setCategoryId(cmd.categoryId());
        }
        if (cmd.article() != null && !cmd.article().equals(product.getArticle())
                && productRepository.existsByArticleAndDeletedAtIsNull(cmd.article())) {
            throw new ConflictException("Product article already exists: " + cmd.article());
        }
        if (cmd.article() != null) {
            product.setArticle(cmd.article());
        }
        if (cmd.name() != null) {
            product.setName(cmd.name());
        }
        if (cmd.description() != null) {
            product.setDescription(cmd.description());
        }
        if (cmd.series() != null) {
            product.setSeries(cmd.series());
        }
        if (cmd.productType() != null) {
            product.setProductType(cmd.productType());
        }
        if (cmd.decor() != null) {
            product.setDecor(cmd.decor());
        }
        if (cmd.material() != null) {
            product.setMaterial(cmd.material());
        }
        if (cmd.capacityMl() != null) {
            product.setCapacityMl(cmd.capacityMl());
        }
        if (cmd.weightG() != null) {
            product.setWeightG(cmd.weightG());
        }
        if (cmd.dimensions() != null) {
            product.setDimensions(cmd.dimensions());
        }
        if (cmd.countryOfOrigin() != null) {
            product.setCountryOfOrigin(cmd.countryOfOrigin());
        }
        if (cmd.barcode() != null) {
            product.setBarcode(cmd.barcode());
        }
        if (cmd.priceCents() != null) {
            product.setPriceCents(cmd.priceCents());
        }
        if (cmd.discountPercent() != null) {
            product.setDiscountPercent(cmd.discountPercent());
        }
        if (cmd.active() != null) {
            product.setActive(cmd.active());
        }
        product.recalculatePrice();
        recalculateAllSkuPrices(product);
        Product saved = productRepository.save(product);
        catalogCache.evictProduct(saved.getId());
        eventPublisher.publish(Topics.CATALOG, saved.getId().toString(),
                Topics.PRODUCT_UPDATED, java.util.Map.of("productId", saved.getId()));
        return saved;
    }

    @Transactional
    public void deleteProduct(UUID id) {
        Product product = findActive(id);
        product.markDeleted();
        productRepository.save(product);
        catalogCache.evictProduct(id);
    }

    @Transactional
    public ProductSku createSku(UUID productId, CreateSkuCommand cmd) {
        Product product = findActive(productId);
        if (skuRepository.existsByArticle(cmd.article())) {
            throw new ConflictException("SKU article already exists: " + cmd.article());
        }
        ProductSku sku = new ProductSku();
        sku.setProductId(productId);
        sku.setName(cmd.name());
        sku.setArticle(cmd.article());
        sku.setPriceCents(cmd.priceCents());
        sku.setDiscountPercent(cmd.discountPercent());
        sku.setStockQty(cmd.stockQty() != null ? cmd.stockQty() : 0);
        sku.recalculatePrice(product);
        ProductSku saved = skuRepository.save(sku);
        catalogCache.evictProduct(saved.getProductId());
        return saved;
    }

    @Transactional
    public ProductSku updateSku(UUID skuId, UpdateSkuCommand cmd) {
        ProductSku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> ResourceNotFoundException.of("Sku", skuId));
        Product product = findActive(sku.getProductId());
        if (cmd.name() != null) {
            sku.setName(cmd.name());
        }
        if (cmd.priceCents() != null) {
            sku.setPriceCents(cmd.priceCents());
        }
        if (cmd.discountPercent() != null) {
            sku.setDiscountPercent(cmd.discountPercent());
        }
        if (cmd.stockQty() != null) {
            sku.setStockQty(cmd.stockQty());
        }
        if (cmd.active() != null) {
            sku.setActive(cmd.active());
        }
        sku.recalculatePrice(product);
        ProductSku saved = skuRepository.save(sku);
        catalogCache.evictProduct(saved.getProductId());
        return saved;
    }

    @Transactional
    public void deactivateSku(UUID skuId) {
        ProductSku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> ResourceNotFoundException.of("Sku", skuId));
        sku.setActive(false);
        skuRepository.save(sku);
        catalogCache.evictProduct(sku.getProductId());
    }

    @Transactional
    public ProductImageResponse uploadImage(UUID productId, UploadImageCommand cmd) {
        Product product = findActive(productId);
        validateImage(cmd.contentType(), cmd.content().length);
        MediaStorage.StoredObject stored =
                mediaStorage.upload(productId, cmd.filename(), cmd.content());

        boolean makeMain = cmd.isMain() || imageRepository.countByProductIdAndMainTrue(productId) == 0;
        if (makeMain) {
            imageRepository.findByProductIdOrderByPositionAscIdAsc(productId)
                    .forEach(image -> image.setMain(false));
        }
        ProductImage image = ProductImage.create(productId, stored.objectKey(), stored.url(),
                cmd.position() != null ? cmd.position() : nextPosition(productId), makeMain);
        imageRepository.save(image);
        catalogCache.evictProduct(productId);
        return new ProductImageResponse(image.getId(), image.getUrl(), image.getPosition(), image.isMain());
    }

    @Transactional
    public ProductImageResponse updateImage(UUID imageId, Integer position, Boolean isMain) {
        ProductImage image = findImage(imageId);
        UUID productId = image.getProductId();
        if (position != null) {
            image.setPosition(position);
        }
        if (isMain != null) {
            if (isMain) {
                imageRepository.findByProductIdOrderByPositionAscIdAsc(productId).forEach(other -> {
                    if (!other.getId().equals(imageId)) {
                        other.setMain(false);
                        imageRepository.save(other);
                    }
                });
            }
            image.setMain(isMain);
        }
        imageRepository.save(image);
        catalogCache.evictProduct(productId);
        return new ProductImageResponse(image.getId(), image.getUrl(), image.getPosition(), image.isMain());
    }

    @Transactional
    public void deleteImage(UUID imageId) {
        ProductImage image = findImage(imageId);
        mediaStorage.delete(image.getObjectKey());
        imageRepository.delete(image);
        catalogCache.evictProduct(image.getProductId());
    }

    private void validateImage(String contentType, int sizeBytes) {
        if (sizeBytes > 10 * 1024 * 1024) {
            throw new BadRequestException("Image exceeds 10 MB limit");
        }
        if (contentType == null || !contentType.matches("image/(jpeg|png|webp)")) {
            throw new BadRequestException("Only JPEG/PNG/WebP images are allowed");
        }
    }

    private int nextPosition(UUID productId) {
        return imageRepository.findByProductIdOrderByPositionAscIdAsc(productId).stream()
                .mapToInt(ProductImage::getPosition)
                .max()
                .orElse(-1) + 1;
    }

    private ProductImage findImage(UUID imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> ResourceNotFoundException.of("Image", imageId));
    }

    private void recalculateAllSkuPrices(Product product) {
        for (ProductSku sku : skuRepository.findByProductIdOrderByCreatedAtAsc(product.getId())) {
            sku.recalculatePrice(product);
            skuRepository.save(sku);
        }
    }

    private Product findActive(UUID id) {
        return productRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Product", id));
    }

    private static void applyProduct(Product product, CreateProductCommand cmd) {
        product.setName(cmd.name());
        product.setDescription(cmd.description());
        product.setSeries(cmd.series());
        product.setProductType(cmd.productType());
        product.setDecor(cmd.decor());
        product.setMaterial(cmd.material());
        product.setCapacityMl(cmd.capacityMl());
        product.setWeightG(cmd.weightG());
        product.setDimensions(cmd.dimensions());
        product.setCountryOfOrigin(cmd.countryOfOrigin());
        product.setBarcode(cmd.barcode());
        product.setPriceCents(cmd.priceCents());
        product.setDiscountPercent(cmd.discountPercent());
        product.setActive(cmd.active() != null ? cmd.active() : true);
    }

    public record CreateProductCommand(
            UUID categoryId,
            String name,
            String article,
            String description,
            String series,
            String productType,
            String decor,
            String material,
            Integer capacityMl,
            Integer weightG,
            String dimensions,
            String countryOfOrigin,
            String barcode,
            Long priceCents,
            Integer discountPercent,
            Boolean active) {

        public CreateProductCommand {
            if (priceCents == null || priceCents < 0) {
                throw new BadRequestException("priceCents must be a non-negative integer");
            }
            if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
                throw new BadRequestException("discountPercent must be between 0 and 100");
            }
        }
    }

    public record UpdateProductCommand(
            UUID categoryId,
            String name,
            String article,
            String description,
            String series,
            String productType,
            String decor,
            String material,
            Integer capacityMl,
            Integer weightG,
            String dimensions,
            String countryOfOrigin,
            String barcode,
            Long priceCents,
            Integer discountPercent,
            Boolean active) {

        public UpdateProductCommand {
            if (priceCents != null && priceCents < 0) {
                throw new BadRequestException("priceCents must be non-negative");
            }
            if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
                throw new BadRequestException("discountPercent must be between 0 and 100");
            }
        }
    }

    public record CreateSkuCommand(
            String name,
            String article,
            Long priceCents,
            Integer discountPercent,
            Integer stockQty) {

        public CreateSkuCommand {
            if (priceCents != null && priceCents < 0) {
                throw new BadRequestException("priceCents must be non-negative");
            }
            if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
                throw new BadRequestException("discountPercent must be between 0 and 100");
            }
            if (stockQty != null && stockQty < 0) {
                throw new BadRequestException("stockQty must be non-negative");
            }
        }
    }

    public record UpdateSkuCommand(
            String name,
            Long priceCents,
            Integer discountPercent,
            Integer stockQty,
            Boolean active) {

        public UpdateSkuCommand {
            if (priceCents != null && priceCents < 0) {
                throw new BadRequestException("priceCents must be non-negative");
            }
            if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
                throw new BadRequestException("discountPercent must be between 0 and 100");
            }
            if (stockQty != null && stockQty < 0) {
                throw new BadRequestException("stockQty must be non-negative");
            }
        }
    }

    public record UploadImageCommand(
            String filename,
            String contentType,
            byte[] content,
            Integer position,
            Boolean isMain) {
    }
}
