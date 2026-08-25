package com.practice.catalog.catalog.api;

import com.practice.catalog.catalog.api.dto.AdminCategoryNodeResponse;
import com.practice.catalog.catalog.api.dto.CategoryNodeResponse;
import com.practice.catalog.catalog.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/categories")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    public AdminCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    public record CreateCategoryRequest(
            String name,
            String slug,
            UUID parentId,
            String description,
            String imageUrl,
            Integer sortOrder) {
    }

    public record UpdateCategoryRequest(
            String name,
            String slug,
            UUID parentId,
            String description,
            String imageUrl,
            Integer sortOrder,
            Boolean isActive) {
    }

    @GetMapping
    public List<AdminCategoryNodeResponse> fullTree() {
        return categoryService.getFullTree();
    }

    @PostMapping
    public ResponseEntity<CategoryNodeResponse> create(@RequestBody CreateCategoryRequest request) {
        var category = categoryService.create(request.name(), request.slug(), request.parentId(),
                request.description(), request.imageUrl(), request.sortOrder(), true);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(category.getId()).toUri();
        return ResponseEntity.created(location).body(toNode(category));
    }

    @PatchMapping("/{id}")
    public CategoryNodeResponse update(@PathVariable UUID id, @RequestBody UpdateCategoryRequest request) {
        var category = categoryService.update(id, request.name(), request.slug(), request.parentId(),
                request.description(), request.imageUrl(), request.sortOrder(), request.isActive());
        return toNode(category);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private CategoryNodeResponse toNode(com.practice.catalog.catalog.domain.Category category) {
        return new CategoryNodeResponse(category.getId(), category.getName(), category.getSlug(),
                category.getImageUrl(), category.getSortOrder(), List.of());
    }
}
