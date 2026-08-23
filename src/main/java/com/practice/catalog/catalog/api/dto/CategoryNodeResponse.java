package com.practice.catalog.catalog.api.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record CategoryNodeResponse(
        UUID id,
        String name,
        String slug,
        String imageUrl,
        int sortOrder,
        List<CategoryNodeResponse> children) {

    public CategoryNodeResponse {
        children = children == null ? new ArrayList<>() : children;
    }
}
