package com.practice.catalog.catalog.api;

import com.practice.catalog.catalog.api.dto.AdminProductCardResponse;
import com.practice.catalog.catalog.api.dto.AdminProductSummaryResponse;
import com.practice.catalog.catalog.api.dto.ProductImageResponse;
import com.practice.catalog.catalog.api.dto.ProductSkuResponse;
import com.practice.catalog.catalog.service.ProductAdminService;
import com.practice.catalog.catalog.service.ProductAdminStatus;
import com.practice.catalog.catalog.service.ProductQueryService;
import com.practice.catalog.catalog.service.ProductSort;
import com.practice.catalog.common.api.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final ProductAdminService productAdminService;
    private final ProductQueryService productQueryService;

    public AdminProductController(ProductAdminService productAdminService,
                                  ProductQueryService productQueryService) {
        this.productAdminService = productAdminService;
        this.productQueryService = productQueryService;
    }

    public record CreateProductRequest(
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
            Boolean isActive) {
    }

    public record UpdateProductRequest(
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
            Boolean isActive) {
    }

    public record CreateSkuRequest(
            String name,
            String article,
            Long priceCents,
            Integer discountPercent,
            Integer stockQty) {
    }

    public record UpdateSkuRequest(
            String name,
            Long priceCents,
            Integer discountPercent,
            Integer stockQty,
            Boolean isActive) {
    }

    public record UpdateImageRequest(
            Integer position,
            Boolean isMain) {
    }

    @GetMapping("/products")
    public PageResponse<AdminProductSummaryResponse> listProducts(
            @RequestParam(defaultValue = "ACTIVE") ProductAdminStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return productQueryService.searchForAdmin(status, q, categoryId,
                ProductSort.fromValue(sort), page, size);
    }

    @GetMapping("/products/{id}")
    public AdminProductCardResponse getProduct(@PathVariable UUID id) {
        return productQueryService.getAdminCard(id);
    }

    @PostMapping("/products")
    public ResponseEntity<AdminProductCardResponse> create(@RequestBody CreateProductRequest request) {
        var product = productAdminService.createProduct(new ProductAdminService.CreateProductCommand(
                request.categoryId(), request.name(), request.article(), request.description(),
                request.series(), request.productType(), request.decor(), request.material(),
                request.capacityMl(), request.weightG(), request.dimensions(),
                request.countryOfOrigin(), request.barcode(),
                request.priceCents(), request.discountPercent(), request.isActive()));
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/admin/products/{id}").buildAndExpand(product.getId()).toUri();
        return ResponseEntity.created(location)
                .body(productQueryService.getAdminCard(product.getId()));
    }

    @PatchMapping("/products/{id}")
    public AdminProductCardResponse update(@PathVariable UUID id, @RequestBody UpdateProductRequest request) {
        productAdminService.updateProduct(id, new ProductAdminService.UpdateProductCommand(
                request.categoryId(), request.name(), request.article(), request.description(),
                request.series(), request.productType(), request.decor(), request.material(),
                request.capacityMl(), request.weightG(), request.dimensions(),
                request.countryOfOrigin(), request.barcode(),
                request.priceCents(), request.discountPercent(), request.isActive()));
        return productQueryService.getAdminCard(id);
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productAdminService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/products/{id}/skus")
    public ResponseEntity<ProductSkuResponse> createSku(@PathVariable UUID id,
                                                        @RequestBody CreateSkuRequest request) {
        var sku = productAdminService.createSku(id, new ProductAdminService.CreateSkuCommand(
                request.name(), request.article(), request.priceCents(),
                request.discountPercent(), request.stockQty()));
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/admin/skus/{id}").buildAndExpand(sku.getId()).toUri();
        return ResponseEntity.created(location).body(new ProductSkuResponse(
                sku.getId(), sku.getName(), sku.getArticle(), sku.getPriceCents(),
                sku.getPriceWithDiscountCents(), sku.getDiscountPercent(),
                sku.getStockQty(), sku.isActive()));
    }

    @PatchMapping("/skus/{skuId}")
    public ProductSkuResponse updateSku(@PathVariable UUID skuId, @RequestBody UpdateSkuRequest request) {
        var sku = productAdminService.updateSku(skuId, new ProductAdminService.UpdateSkuCommand(
                request.name(), request.priceCents(), request.discountPercent(),
                request.stockQty(), request.isActive()));
        return new ProductSkuResponse(sku.getId(), sku.getName(), sku.getArticle(),
                sku.getPriceCents(), sku.getPriceWithDiscountCents(), sku.getDiscountPercent(),
                sku.getStockQty(), sku.isActive());
    }

    @DeleteMapping("/skus/{skuId}")
    public ResponseEntity<Void> deactivateSku(@PathVariable UUID skuId) {
        productAdminService.deactivateSku(skuId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductImageResponse> uploadImage(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Integer position,
            @RequestParam(defaultValue = "false") boolean isMain) throws IOException {
        ProductImageResponse image = productAdminService.uploadImage(id,
                new ProductAdminService.UploadImageCommand(
                        file.getOriginalFilename(), file.getContentType(), file.getBytes(),
                        position, isMain));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(image);
    }

    @PatchMapping("/images/{imageId}")
    public ProductImageResponse updateImage(@PathVariable UUID imageId,
                                            @RequestBody UpdateImageRequest request) {
        return productAdminService.updateImage(imageId, request.position(), request.isMain());
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<Void> deleteImage(@PathVariable UUID imageId) {
        productAdminService.deleteImage(imageId);
        return ResponseEntity.noContent().build();
    }
}
