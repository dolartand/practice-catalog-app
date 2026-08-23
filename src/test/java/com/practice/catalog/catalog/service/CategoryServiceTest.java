package com.practice.catalog.catalog.service;

import com.practice.catalog.catalog.domain.Category;
import com.practice.catalog.catalog.domain.CategoryRepository;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.common.exception.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    CategoryRepository categoryRepository;

    @Mock
    ProductRepository productRepository;

    @Mock
    com.practice.catalog.catalog.service.CatalogCache catalogCache;

    CategoryService categoryService;

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, productRepository, catalogCache);
    }

    private Category category(String slug) {
        Category c = new Category();
        org.springframework.test.util.ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
        c.setName("Чашки");
        c.setSlug(slug);
        return c;
    }

    @Test
    void createRejectsDuplicateSlug() {
        when(categoryRepository.existsBySlug("chashki")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create("Чашки", "chashki", null, null, null, 0, true))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void deleteIsBlockedWhenActiveProductsExist() {
        Category existing = category("chashki");
        when(categoryRepository.findByIdAndDeletedAtIsNull(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(productRepository.existsByCategoryIdAndDeletedAtIsNull(existing.getId())).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(existing.getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void deleteIsBlockedWhenSubcategoriesExist() {
        Category existing = category("chashki");
        when(categoryRepository.findByIdAndDeletedAtIsNull(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(productRepository.existsByCategoryIdAndDeletedAtIsNull(existing.getId())).thenReturn(false);
        when(categoryRepository.existsByParentIdAndDeletedAtIsNull(existing.getId())).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(existing.getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void deleteMarksCategoryDeletedWhenNoChildrenOrProducts() {
        Category existing = category("chashki");
        when(categoryRepository.findByIdAndDeletedAtIsNull(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(productRepository.existsByCategoryIdAndDeletedAtIsNull(existing.getId())).thenReturn(false);
        when(categoryRepository.existsByParentIdAndDeletedAtIsNull(existing.getId())).thenReturn(false);

        assertThatCode(() -> categoryService.delete(existing.getId()))
                .doesNotThrowAnyException();

        verify(categoryRepository).save(any(Category.class));
        org.assertj.core.api.Assertions.assertThat(existing.isDeleted()).isTrue();
    }
}
