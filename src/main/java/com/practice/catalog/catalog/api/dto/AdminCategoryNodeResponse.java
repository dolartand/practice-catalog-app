package com.practice.catalog.catalog.api.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record AdminCategoryNodeResponse(
        UUID id,
        String name,
        String slug,
        String imageUrl,
        int sortOrder,
        boolean isActive,
        Instant deletedAt,
        long activeProductCount,
        List<AdminCategoryNodeResponse> children) {

    public AdminCategoryNodeResponse {
        children = children == null ? new ArrayList<>() : children;
    }
}
