package com.practice.catalog.catalog;

import com.practice.catalog.catalog.domain.Category;
import com.practice.catalog.catalog.domain.CategoryRepository;
import com.practice.catalog.catalog.domain.Product;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.catalog.service.ProductSort;
import com.practice.catalog.testsupport.TestcontainersBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CatalogRepositoryIT extends TestcontainersBase {

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    com.practice.catalog.catalog.domain.ProductSkuRepository skuRepository;

    private Category category(String name, String slug, UUID parentId, boolean active) {
        Category c = new Category();
        c.setName(name);
        c.setSlug(slug);
        c.setParentId(parentId);
        c.setActive(active);
        c.setSortOrder(0);
        return categoryRepository.save(c);
    }

    private Product product(String name, String article, UUID categoryId,
                            long priceCents, Integer discount, String series, String type, boolean active) {
        Product p = new Product();
        p.setName(name);
        p.setArticle(article);
        p.setCategoryId(categoryId);
        p.setPriceCents(priceCents);
        p.setDiscountPercent(discount);
        p.recalculatePrice();
        p.setSeries(series);
        p.setProductType(type);
        p.setActive(active);
        return productRepository.save(p);
    }

    @Test
    void activeTreeReturnsNestedCategoriesOrderedBySortOrderAndSkipsDeleted() {
        Category root = category("Посуда", "posuda", null, true);
        Category child = category("Чашки", "chashki", root.getId(), true);
        Category grandChild = category("Чайные пары", "chaynye-pary", child.getId(), true);
        Category deleted = category("Удалённая", "deleted-cat", root.getId(), true);
        deleted.markDeleted();
        categoryRepository.save(deleted);

        List<Category> tree = categoryRepository.findActiveTree();

        List<UUID> ids = tree.stream().map(Category::getId).toList();
        assertThat(ids).contains(root.getId(), child.getId(), grandChild.getId())
                .doesNotContain(deleted.getId());
        assertThat(ids.indexOf(root.getId()))
                .isLessThan(ids.indexOf(child.getId()))
                .isLessThan(ids.indexOf(grandChild.getId()));
        assertThat(tree.stream().filter(c -> c.getId().equals(grandChild.getId()))
                .findFirst().orElseThrow().getParentId()).isEqualTo(child.getId());
    }

    @Test
    void subtreeIdsIncludeAllDescendantsOnly() {
        Category root = category("Корень", "root-" + UUID.randomUUID(), null, true);
        Category mid = category("Середина", "mid-" + UUID.randomUUID(), root.getId(), true);
        category("Лист", "leaf-" + UUID.randomUUID(), mid.getId(), true);

        List<UUID> ids = categoryRepository.findSubtreeIds(root.getId());

        assertThat(ids).hasSize(3).contains(root.getId(), mid.getId());
    }

    @Test
    void slugIsUniqueOnlyAmongActiveCategories() {
        String slug = "slug-" + UUID.randomUUID();
        Category first = category("Первая", slug, null, true);
        categoryRepository.flush();
        assertThat(categoryRepository.existsBySlug(slug)).isTrue();

        first.markDeleted();
        categoryRepository.saveAndFlush(first);

        Category second = category("Вторая", slug, null, true);
        categoryRepository.saveAndFlush(second);
        assertThat(categoryRepository.existsBySlug(slug)).isTrue();
    }

    @Test
    void articleIsUniqueOnlyAmongActiveProducts() {
        Category cat = category("К", "k-" + UUID.randomUUID(), null, true);
        String article = "ART-" + UUID.randomUUID();
        Product first = product("Первый", article, cat.getId(), 10000, null, null, null, true);

        assertThat(productRepository.existsByArticleAndDeletedAtIsNull(article)).isTrue();

        first.markDeleted();
        productRepository.saveAndFlush(first);
        product("Второй", article, cat.getId(), 12000, null, null, null, true);

        assertThat(productRepository.existsByArticleAndDeletedAtIsNull(article)).isTrue();
    }

    @Test
    void searchByTextArticleAndSeries() {
        Category cat = category("Кат", "search-cat-" + UUID.randomUUID(), null, true);
        Product byName = product("Чайный сервиз Славянский", "SN-1", cat.getId(), 100000, 10, "Славянский", "сервиз", true);
        product("Ваза Хохлома", "SEARCH-ART-2", cat.getId(), 50000, 0, "Хохлома", "ваза", true);
        product("Тарелка", "SN-3", cat.getId(), 20000, 0, "Луговая", "тарелка", true);

        Specification<Product> spec = Specification.where(ProductRepository.Specs.notDeleted())
                .and(ProductRepository.Specs.activeOnly(true))
                .and(ProductRepository.Specs.inCategories(List.of(cat.getId())))
                .and(ProductRepository.Specs.textQuery("славянский"));

        List<Product> found = productRepository.findAll(spec);
        assertThat(found).extracting(Product::getId).containsExactly(byName.getId());

        List<Product> byArticle = productRepository.findAll(Specification.where(
                ProductRepository.Specs.textQuery("search-art-2")));
        assertThat(byArticle).hasSize(1);

        List<Product> bySeries = productRepository.findAll(Specification.where(
                ProductRepository.Specs.seriesEquals("хохлома")));
        assertThat(bySeries).hasSize(1);
    }

    @Test
    void searchFiltersByPriceDiscountAndSorts() {
        Category cat = category("Фильтры", "filters-" + UUID.randomUUID(), null, true);
        Product cheap = product("Дешёвая ваза", "F-1", cat.getId(), 5000, 20, "Базовая", "ваза", true);
        Product mid = product("Средняя ваза", "F-2", cat.getId(), 30000, 50, "Базовая", "ваза", true);
        Product expensive = product("Дорогая ваза", "F-3", cat.getId(), 90000, null, "Премиум", "ваза", true);

        var filtered = productRepository.findAll(Specification.where(
                ProductRepository.Specs.inCategories(List.of(cat.getId())))
                .and(ProductRepository.Specs.priceBetween(4000L, 10000L)));
        assertThat(filtered).extracting(Product::getId).containsExactly(cheap.getId());

        var discounted = productRepository.findAll(Specification.where(
                ProductRepository.Specs.inCategories(List.of(cat.getId())))
                .and(ProductRepository.Specs.discountedOnly()));
        assertThat(discounted).extracting(Product::getId).contains(cheap.getId(), mid.getId())
                .doesNotContain(expensive.getId());

        PageRequest priceAsc = PageRequest.of(0, 10, ProductSort.PRICE_ASC.toSort());
        var sorted = productRepository.findAll(Specification.where(
                ProductRepository.Specs.inCategories(List.of(cat.getId()))), priceAsc);
        assertThat(sorted.getContent()).extracting(Product::getId)
                .containsExactly(cheap.getId(), mid.getId(), expensive.getId());

        PageRequest discountDesc = PageRequest.of(0, 10,
                ProductSort.DISCOUNT_DESC.toSort());
        var byDiscount = productRepository.findAll(Specification.where(
                ProductRepository.Specs.inCategories(List.of(cat.getId()))), discountDesc);
        assertThat(byDiscount.getContent()).extracting(Product::getDiscountPercent)
                .containsExactly(50, 20, null);
    }

    @Test
    void inStockFlagResolvedViaActiveSkuWithPositiveStock() {
        Category cat = category("Остатки", "stock-" + UUID.randomUUID(), null, true);
        Product withStock = product("Есть остаток", "S-1", cat.getId(), 10000, 0, null, null, true);
        Product withoutStock = product("Нет остатка", "S-2", cat.getId(), 10000, 0, null, null, true);

        sku(withStock, 5);
        sku(withoutStock, 0);

        List<UUID> inStock = productRepository.findInStockProductIds(
                List.of(withStock.getId(), withoutStock.getId()));

        assertThat(inStock).containsExactly(withStock.getId());
    }

    @Test
    void ratingDefaultsAreZeroAndRecalculatedFieldPersisted() {
        Category cat = category("Рейтинг", "rating-" + UUID.randomUUID(), null, true);
        Product p = product("Сервиз", "R-1", cat.getId(), 150000, 15, null, null, true);

        assertThat(p.getPriceWithDiscountCents()).isEqualTo(127500L);
        assertThat(p.getRatingAverage()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(p.getRatingCount()).isZero();
    }

    private void sku(Product product, int stockQty) {
        com.practice.catalog.catalog.domain.ProductSku s =
                new com.practice.catalog.catalog.domain.ProductSku();
        s.setProductId(product.getId());
        s.setName("Базовый");
        s.setArticle("SKU-" + UUID.randomUUID());
        s.setStockQty(stockQty);
        s.setActive(true);
        skuRepository.saveAndFlush(s);
    }
}
