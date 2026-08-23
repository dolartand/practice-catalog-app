package com.practice.catalog.auth.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank String secret,
        String issuer,
        String audience,
        @Positive long accessTtlSeconds,
        @Positive long refreshTtlSeconds) {
}
