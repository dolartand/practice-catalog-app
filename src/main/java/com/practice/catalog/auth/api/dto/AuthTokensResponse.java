package com.practice.catalog.auth.api.dto;

public record AuthTokensResponse(
        String accessToken,
        long expiresIn,
        String refreshToken,
        long refreshExpiresIn) {
}
