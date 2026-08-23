package com.practice.catalog.auth.service;

import java.util.UUID;

public record UserProfile(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        UserRoleDto role) {

    public enum UserRoleDto {
        USER, ADMIN
    }
}
