package com.practice.catalog.catalog.service;

import com.practice.catalog.catalog.api.dto.ProductCardResponse;
import com.practice.catalog.catalog.api.dto.ProductImageResponse;
import com.practice.catalog.catalog.api.dto.ProductSkuResponse;
import com.practice.catalog.catalog.api.dto.ProductSummaryResponse;
import com.practice.catalog.catalog.domain.PriceCalculator;
import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductImage;
import com.practice.catalog.catalog.domain.ProductImageRepository;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.domain.ProductSku;
import com.practice.catalog.catalog.domain.ProductSkuRepository;
import com.practice.catalog.common.api.PageResponse;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ProductQueryService {

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductSkuRepository skuRepository;
    private final CategoryService categoryService;

    public ProductQueryService(ProductRepository productRepository,
                               ProductImageRepository imageRepository,
                               ProductSkuRepository skuRepository,
                               CategoryService categoryService) {
        this.productRepository = productRepository;
        this.imageRepository = imageRepository;
        this.skuRepository = skuRepository;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> search(ProductSearchQuery query) {
        Specification<Product> spec = Specification.where(ProductRepository.Specs.notDeleted());
        if (!query.includeInactive()) {
            spec = spec.and(ProductRepository.Specs.activeOnly(true));
        }
        if (query.categoryId() != null) {
            categoryService.findActive(query.categoryId());
            Set<UUID> categoryIds = new HashSet<>(
                    categoryService.subtreeIds(query.categoryId()));
            spec = spec.and(ProductRepository.Specs.inCategories(categoryIds));
        }
        if (query.q() != null && !query.q().isBlank()) {
            spec = spec.and(ProductRepository.Specs.textQuery(query.q().trim()));
        }
        if (query.priceFromCents() != null || query.priceToCents() != null) {
            spec = spec.and(ProductRepository.Specs.priceBetween(query.priceFromCents(), query.priceToCents()));
        }
        if (query.series() != null && !query.series().isBlank()) {
            spec = spec.and(ProductRepository.Specs.seriesEquals(query.series().trim()));
        }
        if (query.type() != null && !query.type().isBlank()) {
            spec = spec.and(ProductRepository.Specs.typeEquals(query.type().trim()));
        }
        if (query.onlyDiscounted()) {
            spec = spec.and(ProductRepository.Specs.discountedOnly());
        }

        int size = Math.min(Math.max(query.size(), 1), ProductSearchQuery.MAX_PAGE_SIZE);
        int page = Math.max(query.page(), 0);
        Page<Product> result = productRepository.findAll(spec,
                PageRequest.of(page, size, query.sort().toSort()));

        Map<UUID, Boolean> stockFlags = resolveStock(result.getContent());
        Map<UUID, String> mainImages = resolveMainImages(result.getContent());

        List<ProductSummaryResponse> items = result.getContent().stream()
                .map(product -> toSummary(product,
                        mainImages.get(product.getId()),
                        stockFlags.getOrDefault(product.getId(), false)))
                .toList();
        return new PageResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ProductCardResponse getPublicCard(UUID id) {
        Product product = findActive(id);
        if (!product.isActive()) {
            throw ResourceNotFoundException.of("Product", id);
        }
        return toCard(product, false);
    }

    @Transactional(readOnly = true)
    public ProductCardResponse getAdminCard(UUID id) {
        return toCard(findActive(id), true);
    }

    @Transactional(readOnly = true)
    public Product findActive(UUID id) {
        return productRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Product", id));
    }

    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> summariesByIds(List<UUID> productIds) {
        List<Product> products = productRepository.findAllById(productIds).stream()
                .filter(p -> !p.isDeleted() && p.isActive())
                .toList();
        Map<UUID, Boolean> stockFlags = resolveStock(products);
        Map<UUID, String> mainImages = resolveMainImages(products);
        return productIds.stream()
                .map(id -> products.stream().filter(p -> p.getId().equals(id)).findFirst().orElse(null))
                .filter(p -> p != null)
                .map(product -> toSummary(product,
                        mainImages.get(product.getId()),
                        stockFlags.getOrDefault(product.getId(), false)))
                .toList();
    }

    private ProductCardResponse toCard(Product product, boolean includeInactiveSkus) {
        List<ProductImageResponse> images = imageRepository
                .findByProductIdOrderByPositionAscIdAsc(product.getId()).stream()
                .map(image -> new ProductImageResponse(image.getId(), image.getUrl(),
                        image.getPosition(), image.isMain()))
                .toList();
        List<ProductSkuResponse> skus = skuRepository
                .findByProductIdOrderByCreatedAtAsc(product.getId()).stream()
                .filter(sku -> includeInactiveSkus || sku.isActive())
                .map(sku -> toSkuResponse(withEffectivePrice(product, sku)))
                .toList();
        return new ProductCardResponse(
                product.getId(), product.getCategoryId(), product.getName(), product.getArticle(),
                product.getDescription(), product.getSeries(), product.getProductType(),
                product.getDecor(), product.getMaterial(), product.getCapacityMl(), product.getWeightG(),
                product.getDimensions(), product.getCountryOfOrigin(), product.getBarcode(),
                product.getPriceCents(), product.getDiscountPercent(), product.getPriceWithDiscountCents(),
                product.getRatingAverage(), product.getRatingCount(), images, skus);
    }

    private ProductSku withEffectivePrice(Product product, ProductSku sku) {
        if (sku.getPriceWithDiscountCents() == null) {
            sku.setPriceWithDiscountCents(PriceCalculator.effectiveSkuPriceWithDiscount(product, sku));
        }
        return sku;
    }

    private ProductSkuResponse toSkuResponse(ProductSku sku) {
        return new ProductSkuResponse(sku.getId(), sku.getName(), sku.getArticle(),
                sku.getPriceCents(), sku.getPriceWithDiscountCents(), sku.getDiscountPercent(),
                sku.getStockQty(), sku.isActive());
    }

    private ProductSummaryResponse toSummary(Product product, String mainImageUrl, boolean inStock) {
        return new ProductSummaryResponse(
                product.getId(), product.getName(), product.getArticle(), product.getSeries(),
                product.getProductType(), product.getPriceCents(), product.getDiscountPercent(),
                product.getPriceWithDiscountCents(), mainImageUrl,
                product.getRatingAverage(), product.getRatingCount(), inStock);
    }

    @Transactional(readOnly = true)
    public java.util.Map<UUID, Boolean> stockFlags(List<UUID> productIds) {
        return resolveStock(productRepository.findAllById(productIds).stream()
                .filter(p -> !p.isDeleted())
                .toList());
    }

    @Transactional(readOnly = true)
    public java.util.Map<UUID, Integer> liveStockBySku(UUID productId) {
        java.util.Map<UUID, Integer> stocks = new java.util.HashMap<>();
        for (ProductSku sku : skuRepository.findByProductIdOrderByCreatedAtAsc(productId)) {
            stocks.put(sku.getId(), sku.getStockQty());
        }
        return stocks;
    }

    private Map<UUID, Boolean> resolveStock(List<Product> products) {
        List<UUID> ids = products.stream().map(Product::getId).toList();
        Map<UUID, Boolean> flags = new HashMap<>();
        for (UUID id : ids) {
            flags.put(id, false);
        }
        if (!ids.isEmpty()) {
            for (UUID inStockId : productRepository.findInStockProductIds(ids)) {
                flags.put(inStockId, true);
            }
        }
        return flags;
    }

    private Map<UUID, String> resolveMainImages(List<Product> products) {
        Map<UUID, String> urls = new HashMap<>();
        for (Product product : products) {
            List<ProductImage> images = imageRepository.findByProductIdOrderByPositionAscIdAsc(product.getId());
            images.stream().filter(ProductImage::isMain).findFirst()
                    .or(() -> images.stream().findFirst())
                    .ifPresent(image -> urls.put(product.getId(), image.getUrl()));
        }
        return urls;
    }
}
