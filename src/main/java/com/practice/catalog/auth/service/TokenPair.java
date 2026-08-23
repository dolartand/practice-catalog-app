package com.practice.catalog.auth.service;

public record TokenPair(
        String accessToken,
        long accessExpiresIn,
        String refreshToken,
        long refreshExpiresIn) {
}
