package com.practice.catalog.catalog.domain;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    boolean existsByArticleAndDeletedAtIsNull(String article);

    boolean existsByCategoryIdAndDeletedAtIsNull(UUID categoryId);

    Optional<Product> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
            select s.productId from ProductSku s
            where s.productId in :productIds and s.active = true and s.stockQty > 0
            """)
    List<UUID> findInStockProductIds(Collection<UUID> productIds);

    interface Specs {
        static Specification<Product> notDeleted() {
            return (root, q, cb) -> cb.isNull(root.get("deletedAt"));
        }

        static Specification<Product> activeOnly(boolean activeOnly) {
            return activeOnly
                    ? (root, q, cb) -> cb.isTrue(root.get("active"))
                    : null;
        }

        static Specification<Product> inCategories(Collection<UUID> categoryIds) {
            return (root, q, cb) -> root.get("categoryId").in(categoryIds);
        }

        static Specification<Product> textQuery(String text) {
            String pattern = "%" + text.toLowerCase() + "%";
            return (root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("article")), pattern),
                    cb.like(cb.lower(root.get("series")), pattern));
        }

        static Specification<Product> priceBetween(Long fromCents, Long toCents) {
            return (root, q, cb) -> {
                jakarta.persistence.criteria.Path<Long> price =
                        root.<Long>get("priceWithDiscountCents");
                if (fromCents != null && toCents != null) {
                    return cb.between(price, fromCents, toCents);
                }
                if (fromCents != null) {
                    return cb.ge(price, fromCents);
                }
                return cb.le(price, toCents);
            };
        }

        static Specification<Product> seriesEquals(String series) {
            return (root, q, cb) -> cb.equal(cb.lower(root.get("series")), series.toLowerCase());
        }

        static Specification<Product> typeEquals(String type) {
            return (root, q, cb) -> cb.equal(cb.lower(root.get("productType")), type.toLowerCase());
        }

        static Specification<Product> discountedOnly() {
            return (root, q, cb) -> cb.and(
                    cb.isNotNull(root.get("discountPercent")),
                    cb.greaterThan(root.get("discountPercent"), 0));
        }
    }
}
