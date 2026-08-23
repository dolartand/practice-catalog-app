package com.practice.catalog.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    boolean existsBySlug(String slug);

    boolean existsByParentIdAndDeletedAtIsNull(UUID parentId);

    Optional<Category> findByIdAndDeletedAtIsNull(UUID id);

    @Query(value = """
            WITH RECURSIVE tree AS (
                SELECT id, parent_id, name, slug, description, image_url, sort_order, is_active,
                       created_at, updated_at, deleted_at, 0 AS level
                  FROM categories WHERE parent_id IS NULL AND deleted_at IS NULL
                UNION ALL
                SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.image_url, c.sort_order,
                       c.is_active, c.created_at, c.updated_at, c.deleted_at, t.level + 1
                  FROM categories c JOIN tree t ON c.parent_id = t.id WHERE c.deleted_at IS NULL
            )
            SELECT id, parent_id, name, slug, description, image_url, sort_order, is_active,
                   created_at, updated_at, deleted_at FROM tree ORDER BY level, sort_order, name
            """, nativeQuery = true)
    List<Category> findActiveTree();

    @Query(value = """
            WITH RECURSIVE sub(id) AS (
                SELECT id FROM categories WHERE id = :rootId
                UNION ALL
                SELECT c.id FROM categories c JOIN sub s ON c.parent_id = s.id WHERE c.deleted_at IS NULL
            )
            SELECT id FROM sub
            """, nativeQuery = true)
    List<UUID> findSubtreeIds(UUID rootId);
}
