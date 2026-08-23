package com.practice.catalog.catalog.api;

import com.practice.catalog.catalog.api.dto.CategoryNodeResponse;
import com.practice.catalog.catalog.api.dto.ProductCardResponse;
import com.practice.catalog.catalog.api.dto.ProductSkuResponse;
import com.practice.catalog.catalog.api.dto.ProductSummaryResponse;
import com.practice.catalog.catalog.service.CatalogCache;
import com.practice.catalog.catalog.service.CategoryService;
import com.practice.catalog.catalog.service.ProductQueryService;
import com.practice.catalog.catalog.service.ProductSearchQuery;
import com.practice.catalog.catalog.service.ProductSort;
import com.practice.catalog.common.api.PageResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    public static final String CACHE_PUBLIC = "public, max-age=300";
    public static final String NO_STORE = "no-store";

    private final CategoryService categoryService;
    private final ProductQueryService productQueryService;
    private final CatalogCache cache;

    public CatalogController(CategoryService categoryService,
                             ProductQueryService productQueryService,
                             CatalogCache cache) {
        this.categoryService = categoryService;
        this.productQueryService = productQueryService;
        this.cache = cache;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryNodeResponse>> categoryTree() {
        List<CategoryNodeResponse> tree = cache
                .getList(CatalogCache.TREE_KEY, CategoryNodeResponse.class, "tree")
                .orElseGet(() -> {
                    List<CategoryNodeResponse> fresh = categoryService.getTree();
                    cache.put(CatalogCache.TREE_KEY, fresh);
                    return fresh;
                });
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, CACHE_PUBLIC)
                .body(tree);
    }

    @GetMapping("/products")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> searchProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Long priceFrom,
            @RequestParam(required = false) Long priceTo,
            @RequestParam(required = false) String series,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(defaultValue = "false") boolean onlyDiscounted,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        ProductSort productSort = ProductSort.fromValue(sort);
        boolean stockSensitive = inStock || onlyDiscounted;

        PageResponse<ProductSummaryResponse> response;
        String cacheControl;
        if (stockSensitive) {
            response = searchDirect(q, categoryId, priceFrom, priceTo, series, type,
                    inStock, onlyDiscounted, productSort, page, size);
            cacheControl = NO_STORE;
        } else {
            int safePage = Math.max(page, 0);
            int safeSize = Math.max(size, 1);
            String listKey = CatalogCache.LIST_PREFIX
                    + CatalogCache.listHash(q, categoryId, priceFrom, priceTo, series, type, sort)
                    + ":" + safePage + ":" + safeSize;
            if (cache.isNegative(listKey)) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CACHE_CONTROL, CACHE_PUBLIC)
                        .body(new PageResponse<>(List.of(), safePage, safeSize, 0, 0));
            }
            response = cache.get(listKey, CatalogControllerCachedList.class, "list")
                    .<PageResponse<ProductSummaryResponse>>map(CatalogControllerCachedList::toPage)
                    .orElseGet(() -> loadAndCacheList(q, categoryId, priceFrom, priceTo,
                            series, type, productSort, safePage, safeSize, listKey));
            cacheControl = CACHE_PUBLIC;
        }

        List<ProductSummaryResponse> withStock = overlayStock(response.items());
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, cacheControl)
                .body(new PageResponse<>(withStock, response.page(), response.size(),
                        response.total(), response.totalPages()));
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<ProductCardResponse> productCard(
            @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        String key = CatalogCache.PRODUCT_PREFIX + id;
        CatalogControllerCachedCard cached =
                cache.get(key, CatalogControllerCachedCard.class, "product").orElse(null);
        String etag;
        ProductCardResponse card;
        if (cached != null) {
            etag = cached.etag();
            card = cached.card();
        } else {
            try {
                card = productQueryService.getPublicCard(id);
            } catch (com.practice.catalog.common.exception.ResourceNotFoundException e) {
                cache.putNegative(key);
                throw e;
            }
            etag = cache.computeEtag(stripped(card));
            cache.put(key, new CatalogControllerCachedCard(etag, stripped(card)));
        }

        Map<UUID, Integer> liveStock = productQueryService.liveStockBySku(id);
        List<ProductSkuResponse> liveSkus = card.skus().stream()
                .map(sku -> new ProductSkuResponse(sku.id(), sku.name(), sku.article(),
                        sku.priceCents(), sku.priceWithDiscountCents(), sku.discountPercent(),
                        liveStock.getOrDefault(sku.id(), 0), sku.isActive()))
                .toList();
        ProductCardResponse live = new ProductCardResponse(card.id(), card.categoryId(),
                card.name(), card.article(), card.description(), card.series(), card.productType(),
                card.decor(), card.material(), card.capacityMl(), card.weightG(), card.dimensions(),
                card.countryOfOrigin(), card.barcode(), card.priceCents(), card.discountPercent(),
                card.priceWithDiscountCents(), card.ratingAverage(), card.ratingCount(),
                card.images(), liveSkus);

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ETAG, "\"" + etag + "\"");
        headers.set(HttpHeaders.CACHE_CONTROL, NO_STORE);
        if (etag.equals(trimQuotes(ifNoneMatch))) {
            return new ResponseEntity<>(headers, HttpStatus.NOT_MODIFIED);
        }
        return ResponseEntity.ok().headers(headers).body(live);
    }

    private ProductCardResponse stripped(ProductCardResponse card) {
        List<ProductSkuResponse> skus = card.skus().stream()
                .map(sku -> new ProductSkuResponse(sku.id(), sku.name(), sku.article(),
                        sku.priceCents(), sku.priceWithDiscountCents(), sku.discountPercent(),
                        null, sku.isActive()))
                .toList();
        return new ProductCardResponse(card.id(), card.categoryId(), card.name(), card.article(),
                card.description(), card.series(), card.productType(), card.decor(), card.material(),
                card.capacityMl(), card.weightG(), card.dimensions(), card.countryOfOrigin(),
                card.barcode(), card.priceCents(), card.discountPercent(),
                card.priceWithDiscountCents(), card.ratingAverage(), card.ratingCount(),
                card.images(), skus);
    }

    private PageResponse<ProductSummaryResponse> loadAndCacheList(
            String q, UUID categoryId, Long priceFrom, Long priceTo, String series, String type,
            ProductSort sort, int page, int size, String key) {
        PageResponse<ProductSummaryResponse> fresh = searchDirect(
                q, categoryId, priceFrom, priceTo, series, type, false, false, sort, page, size);
        if (fresh.total() == 0) {
            cache.putNegative(key);
        } else {
            cache.put(key, new CatalogControllerCachedList(fresh.page(), fresh.size(),
                    fresh.total(), fresh.totalPages(),
                    fresh.items().stream()
                            .map(item -> new ProductSummaryResponse(item.id(), item.name(),
                                    item.article(), item.series(), item.productType(),
                                    item.priceCents(), item.discountPercent(),
                                    item.priceWithDiscountCents(), item.mainImageUrl(),
                                    item.ratingAverage(), item.ratingCount(), false))
                            .toList()));
        }
        return fresh;
    }

    private PageResponse<ProductSummaryResponse> searchDirect(
            String q, UUID categoryId, Long priceFrom, Long priceTo, String series, String type,
            boolean inStock, boolean onlyDiscounted, ProductSort sort, int page, int size) {
        return productQueryService.search(new ProductSearchQuery(
                q, categoryId, priceFrom, priceTo, series, type,
                inStock, onlyDiscounted, false, sort, page, size));
    }

    private List<ProductSummaryResponse> overlayStock(List<ProductSummaryResponse> items) {
        if (items.isEmpty()) {
            return items;
        }
        Map<UUID, Boolean> flags = productQueryService.stockFlags(
                items.stream().map(ProductSummaryResponse::id).toList());
        return items.stream()
                .map(item -> new ProductSummaryResponse(item.id(), item.name(), item.article(),
                        item.series(), item.productType(), item.priceCents(), item.discountPercent(),
                        item.priceWithDiscountCents(), item.mainImageUrl(), item.ratingAverage(),
                        item.ratingCount(), flags.getOrDefault(item.id(), false)))
                .toList();
    }

    private static String trimQuotes(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("W/")) {
            trimmed = trimmed.substring(2);
        }
        return trimmed.replace("\"", "");
    }

    public record CatalogControllerCachedCard(String etag, ProductCardResponse card) {
    }

    public record CatalogControllerCachedList(int page, int size, long total, int totalPages,
                                              List<ProductSummaryResponse> items) {

        PageResponse<ProductSummaryResponse> toPage() {
            return new PageResponse<>(items, page, size, total, totalPages);
        }
    }
}
