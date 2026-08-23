package com.practice.catalog.catalog.api.dto;

import java.util.UUID;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
public record ProductImageResponse(
        UUID id,
        String url,
        int position,
        boolean isMain) {
}
