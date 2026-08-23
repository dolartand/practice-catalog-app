package com.practice.catalog.auth.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserProfileResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String role) {
}
