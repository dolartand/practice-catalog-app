package com.practice.catalog.auth.api;

import com.practice.catalog.auth.api.dto.AuthTokensResponse;
import com.practice.catalog.auth.api.dto.ChangePasswordRequest;
import com.practice.catalog.auth.api.dto.LoginRequest;
import com.practice.catalog.auth.api.dto.LogoutRequest;
import com.practice.catalog.auth.api.dto.RefreshRequest;
import com.practice.catalog.auth.api.dto.RegisterRequest;
import com.practice.catalog.auth.api.dto.UserProfileResponse;
import com.practice.catalog.auth.service.AuthService;
import com.practice.catalog.auth.service.TokenPair;
import com.practice.catalog.auth.service.UserProfile;
import com.practice.catalog.common.exception.BadRequestException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final int MIN_NAME_LENGTH = 1;
    private static final int MAX_NAME_LENGTH = 100;
    private static final int MAX_PHONE_LENGTH = 30;

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthTokensResponse> register(@Valid @RequestBody RegisterRequest request) {
        TokenPair pair = authService.register(request.email(), request.password(),
                request.firstName(), request.lastName(), request.phone());
        return ResponseEntity.status(HttpStatus.CREATED).body(toTokens(pair));
    }

    @PostMapping("/login")
    public AuthTokensResponse login(@Valid @RequestBody LoginRequest request) {
        return toTokens(authService.login(request.email(), request.password()));
    }

    @PostMapping("/refresh")
    public AuthTokensResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return toTokens(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UUID userId,
                                       @Valid @RequestBody LogoutRequest request) {
        authService.logout(userId, request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAll(@AuthenticationPrincipal UUID userId) {
        authService.logoutAll(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UUID userId,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request.currentPassword(),
                request.newPassword(), request.newPasswordConfirm());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal UUID userId) {
        return toProfile(authService.getProfile(userId));
    }

    @PatchMapping("/me")
    public UserProfileResponse updateMe(@AuthenticationPrincipal UUID userId,
                                        @RequestBody JsonNode body) {
        return toProfile(authService.updateProfile(userId, parseProfileUpdate(body)));
    }

    private AuthService.ProfileUpdate parseProfileUpdate(JsonNode body) {
        if (!body.isObject()) {
            throw new BadRequestException("JSON object expected");
        }
        String firstName = null;
        String lastName = null;
        String phone = null;
        boolean phoneSet = false;
        boolean anyField = false;
        for (Map.Entry<String, JsonNode> field : body.properties()) {
            switch (field.getKey()) {
                case "firstName" -> {
                    firstName = requireName(field.getValue(), "firstName");
                    anyField = true;
                }
                case "lastName" -> {
                    lastName = requireName(field.getValue(), "lastName");
                    anyField = true;
                }
                case "phone" -> {
                    JsonNode value = field.getValue();
                    if (!value.isNull()) {
                        String phoneValue = value.asString();
                        if (!value.isTextual() || phoneValue.isBlank() || phoneValue.length() > MAX_PHONE_LENGTH) {
                            throw new BadRequestException(
                                    "phone must be a string up to " + MAX_PHONE_LENGTH + " characters");
                        }
                        phone = phoneValue;
                    }
                    phoneSet = true;
                    anyField = true;
                }
                default -> throw new BadRequestException("Unsupported field: " + field.getKey());
            }
        }
        if (!anyField) {
            throw new BadRequestException("At least one field must be provided");
        }
        return new AuthService.ProfileUpdate(firstName, lastName, phone, phoneSet);
    }

    private String requireName(JsonNode value, String fieldName) {
        String nameValue = value.asString();
        if (!value.isTextual() || nameValue.isBlank()
                || nameValue.length() < MIN_NAME_LENGTH || nameValue.length() > MAX_NAME_LENGTH) {
            throw new BadRequestException(
                    fieldName + " must be a string from " + MIN_NAME_LENGTH + " to " + MAX_NAME_LENGTH + " characters");
        }
        return nameValue;
    }

    private AuthTokensResponse toTokens(TokenPair pair) {
        return new AuthTokensResponse(pair.accessToken(), pair.accessExpiresIn(),
                pair.refreshToken(), pair.refreshExpiresIn());
    }

    private UserProfileResponse toProfile(UserProfile profile) {
        return new UserProfileResponse(profile.id(), profile.email(), profile.firstName(),
                profile.lastName(), profile.phone(), profile.role().name());
    }
}
