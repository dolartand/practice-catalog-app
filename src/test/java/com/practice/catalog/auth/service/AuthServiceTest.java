package com.practice.catalog.auth.service;

import com.practice.catalog.auth.domain.RefreshToken;
import com.practice.catalog.auth.domain.RefreshTokenRepository;
import com.practice.catalog.auth.domain.User;
import com.practice.catalog.auth.domain.UserRepository;
import com.practice.catalog.auth.domain.UserRole;
import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.UnauthorizedException;
import com.practice.catalog.common.exception.UnprocessableEntityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    RefreshTokenRepository refreshTokenRepository;

    @Mock
    com.practice.catalog.auth.service.RefreshTokenRevoker refreshTokenRevoker;

    JwtProvider jwtProvider;

    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    AuthService authService;

    final JwtProperties jwtProperties = new JwtProperties(
            "unit-test-secret-key-0123456789abcdef0123456789",
            "test-issuer", "test-audience", 900L, 2592000L);

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(jwtProperties);
        authService = new AuthService(userRepository, refreshTokenRepository,
                jwtProvider, jwtProperties, passwordEncoder, refreshTokenRevoker);
    }

    private User user(String email, String rawPassword) {
        User user = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(UserRole.USER);
        return user;
    }

    private RefreshToken storedRefresh(User user, String jti, boolean revoked) {
        RefreshToken token = RefreshToken.issue(user.getId(), jti, Instant.now().plusSeconds(3600));
        if (revoked) {
            token.revoke();
        }
        return token;
    }

    @Test
    void registerCreatesUserWithUserRoleAndReturnsTokens() {
        when(userRepository.existsByEmailIgnoreCase("Ivan@Test.by")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(savedUser, "id", UUID.randomUUID());
            return savedUser;
        });

        TokenPair pair = authService.register("Ivan@Test.by", "password123", "Ivan", "Ivanov", "+375291112233");

        assertThat(pair.accessToken()).isNotBlank();
        assertThat(pair.refreshToken()).isNotBlank();
        assertThat(pair.accessExpiresIn()).isEqualTo(900L);
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(UserRole.USER);
        assertThat(saved.getEmail()).isEqualTo("ivan@test.by");
        assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
    }

    @Test
    void registerDuplicateEmailThrowsConflict() {
        when(userRepository.existsByEmailIgnoreCase("dup@test.by")).thenReturn(true);

        assertThatThrownBy(() -> authService.register("dup@test.by", "password123", "Ivan", null, null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void loginSuccessReturnsTokens() {
        User existing = user("login@test.by", "password123");
        when(userRepository.findByEmailIgnoreCase("login@test.by")).thenReturn(Optional.of(existing));

        TokenPair pair = authService.login("login@test.by", "password123");

        assertThat(pair.accessToken()).isNotBlank();
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void loginWrongPasswordThrowsUnauthorized() {
        User existing = user("login@test.by", "password123");
        when(userRepository.findByEmailIgnoreCase("login@test.by")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.login("login@test.by", "wrong-password"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refreshRotatesAndRevokesOldToken() {
        User existing = user("rot@test.by", "password123");
        RefreshToken stored = storedRefresh(existing, "jti-old", false);
        when(refreshTokenRepository.findByJti("jti-old")).thenReturn(Optional.of(stored));
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        String rawRefresh = issueRawRefreshToken(existing.getId(), "jti-old");

        TokenPair pair = authService.refresh(rawRefresh);

        assertThat(stored.isRevoked()).isTrue();
        assertThat(pair.refreshToken()).isNotEqualTo(rawRefresh);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void refreshReuseOfRevokedRevokesAllTokensForUser() {
        User existing = user("reuse@test.by", "password123");
        RefreshToken revoked = storedRefresh(existing, "jti-reused", true);
        when(refreshTokenRepository.findByJti("jti-reused")).thenReturn(Optional.of(revoked));
        String rawRefresh = issueRawRefreshToken(existing.getId(), "jti-reused");

        assertThatThrownBy(() -> authService.refresh(rawRefresh))
                .isInstanceOf(UnauthorizedException.class);

        verify(refreshTokenRevoker).revokeAllForUser(existing.getId());
    }

    @Test
    void changePasswordRevokesAllSessionsOnSuccess() {
        User existing = user("pwd@test.by", "old-password-1");
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        authService.changePassword(existing.getId(), "old-password-1", "new-password-1", "new-password-1");

        assertThat(passwordEncoder.matches("new-password-1", existing.getPasswordHash())).isTrue();
        verify(refreshTokenRepository).revokeAllForUser(existing.getId());
    }

    @Test
    void changePasswordWrongCurrentThrowsUnauthorized() {
        User existing = user("pwd@test.by", "old-password-1");
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.changePassword(existing.getId(), "bad-current", "new-password-1", "new-password-1"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void changePasswordMismatchConfirmThrowsUnprocessable() {
        User existing = user("pwd@test.by", "old-password-1");
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.changePassword(existing.getId(), "old-password-1", "new-password-1", "other-confirm"))
                .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    void changePasswordSameAsCurrentThrowsConflict() {
        User existing = user("pwd@test.by", "same-password-1");
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.changePassword(existing.getId(), "same-password-1", "same-password-1", "same-password-1"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void updateProfileEmptyUpdateThrowsBadRequest() {
        assertThatThrownBy(() -> authService.updateProfile(UUID.randomUUID(), new AuthService.ProfileUpdate(null, null, null, false)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void updateProfileNullPhoneClearsPhone() {
        User existing = user("profile@test.by", "password123");
        existing.setFirstName("Old");
        existing.setPhone("+375291112233");
        when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        UserProfile profile = authService.updateProfile(existing.getId(),
                new AuthService.ProfileUpdate("New", null, null, true));

        assertThat(profile.firstName()).isEqualTo("New");
        assertThat(profile.phone()).isNull();
    }

    private String issueRawRefreshToken(UUID userId, String jti) {
        return jwtProvider.generateRefreshToken(userId, jti).value();
    }
}
