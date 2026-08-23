package com.practice.catalog.catalog.service;

import com.practice.catalog.catalog.api.dto.CategoryNodeResponse;
import com.practice.catalog.catalog.domain.Category;
import com.practice.catalog.catalog.domain.CategoryRepository;
import com.practice.catalog.catalog.domain.ProductRepository;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CatalogCache catalogCache;

    public CategoryService(CategoryRepository categoryRepository,
                           ProductRepository productRepository,
                           CatalogCache catalogCache) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.catalogCache = catalogCache;
    }

    @Transactional(readOnly = true)
    public List<CategoryNodeResponse> getTree() {
        List<Category> flat = categoryRepository.findActiveTree();
        Map<UUID, CategoryNodeResponse> nodes = new HashMap<>();
        List<CategoryNodeResponse> roots = new java.util.ArrayList<>();
        for (Category category : flat) {
            nodes.put(category.getId(), new CategoryNodeResponse(
                    category.getId(), category.getName(), category.getSlug(),
                    category.getImageUrl(), category.getSortOrder(), null));
        }
        for (Category category : flat) {
            CategoryNodeResponse node = nodes.get(category.getId());
            if (category.getParentId() == null) {
                roots.add(node);
            } else {
                CategoryNodeResponse parent = nodes.get(category.getParentId());
                if (parent != null) {
                    parent.children().add(node);
                }
            }
        }
        return roots;
    }

    @Transactional
    public Category create(String name, String slug, UUID parentId,
                           String description, String imageUrl, Integer sortOrder, boolean active) {
        if (categoryRepository.existsBySlug(slug)) {
            throw new ConflictException("Category slug already exists: " + slug);
        }
        if (parentId != null) {
            Category parent = findActive(parentId);
            if (!parent.isActive()) {
                throw new ConflictException("Parent category is inactive");
            }
        }
        Category category = new Category();
        apply(category, name, slug, parentId, description, imageUrl, sortOrder, active);
        Category saved = categoryRepository.save(category);
        catalogCache.evictCategories();
        return saved;
    }

    @Transactional
    public Category update(UUID id, String name, String slug, UUID parentId,
                           String description, String imageUrl, Integer sortOrder, Boolean active) {
        Category category = findActive(id);
        if (slug != null && !slug.equals(category.getSlug()) && categoryRepository.existsBySlug(slug)) {
            throw new ConflictException("Category slug already exists: " + slug);
        }
        if (parentId != null) {
            if (categoryRepository.findSubtreeIds(id).contains(parentId)) {
                throw new ConflictException("Category cannot be moved inside its own subtree");
            }
            findActive(parentId);
        }
        apply(category,
                name != null ? name : category.getName(),
                slug != null ? slug : category.getSlug(),
                parentId != null ? parentId : category.getParentId(),
                description != null ? description : category.getDescription(),
                imageUrl != null ? imageUrl : category.getImageUrl(),
                sortOrder != null ? sortOrder : category.getSortOrder(),
                active != null ? active : category.isActive());
        Category saved = categoryRepository.save(category);
        catalogCache.evictCategories();
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        Category category = findActive(id);
        if (productRepository.existsByCategoryIdAndDeletedAtIsNull(id)) {
            throw new ConflictException("Category has active products");
        }
        if (categoryRepository.existsByParentIdAndDeletedAtIsNull(id)) {
            throw new ConflictException("Category has subcategories");
        }
        category.markDeleted();
        categoryRepository.save(category);
        catalogCache.evictCategories();
    }

    @Transactional(readOnly = true)
    public Category findActive(UUID id) {
        return categoryRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Category", id));
    }

    @Transactional(readOnly = true)
    public List<UUID> subtreeIds(UUID categoryId) {
        findActive(categoryId);
        return categoryRepository.findSubtreeIds(categoryId);
    }

    private void apply(Category category, String name, String slug, UUID parentId,
                       String description, String imageUrl, Integer sortOrder, boolean active) {
        category.setName(name);
        category.setSlug(slug);
        category.setParentId(parentId);
        category.setDescription(description);
        category.setImageUrl(imageUrl);
        category.setSortOrder(sortOrder != null ? sortOrder : 0);
        category.setActive(active);
    }
}
