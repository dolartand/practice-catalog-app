package com.practice.catalog.auth.service;

import com.practice.catalog.auth.domain.RefreshToken;
import com.practice.catalog.auth.domain.User;
import com.practice.catalog.auth.domain.UserRepository;
import com.practice.catalog.auth.domain.UserRole;
import com.practice.catalog.auth.domain.RefreshTokenRepository;
import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.common.exception.UnauthorizedException;
import com.practice.catalog.common.exception.UnprocessableEntityException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private static final int BCRYPT_COST = 12;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRevoker refreshTokenRevoker;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtProvider jwtProvider,
                       JwtProperties jwtProperties,
                       PasswordEncoder passwordEncoder,
                       RefreshTokenRevoker refreshTokenRevoker) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProvider = jwtProvider;
        this.jwtProperties = jwtProperties;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRevoker = refreshTokenRevoker;
    }

    @Transactional
    public TokenPair register(String email, String rawPassword, String firstName, String lastName, String phone) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email already registered");
        }
        User user = new User();
        user.setEmail(email.toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhone(phone);
        user.setRole(UserRole.USER);
        userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public TokenPair login(String email, String rawPassword) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }
        return issueTokens(user);
    }

    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        JwtProvider.ParsedRefresh parsed = jwtProvider.parseRefresh(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByJti(parsed.jti())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        if (stored.isRevoked()) {
            refreshTokenRevoker.revokeAllForUser(stored.getUserId());
            throw new UnauthorizedException("Refresh token reuse detected, all sessions revoked");
        }
        User user = userRepository.findById(parsed.userId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        stored.revoke();
        return issueTokens(user);
    }

    @Transactional
    public void logout(UUID userId, String rawRefreshToken) {
        JwtProvider.ParsedRefresh parsed = jwtProvider.parseRefresh(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByJti(parsed.jti())
                .filter(token -> token.belongsTo(userId))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        stored.revoke();
    }

    @Transactional
    public void logoutAll(UUID userId) {
        refreshTokenRepository.revokeAllForUser(userId);
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword, String newPasswordConfirm) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
        if (!newPassword.equals(newPasswordConfirm)) {
            throw new UnprocessableEntityException("newPassword and newPasswordConfirm do not match");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ConflictException("New password must differ from current password");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        refreshTokenRepository.revokeAllForUser(userId);
    }

    @Transactional(readOnly = true)
    public UserProfile getProfile(UUID userId) {
        return toProfile(findUser(userId));
    }

    @Transactional
    public UserProfile updateProfile(UUID userId, ProfileUpdate update) {
        if (update.isEmpty()) {
            throw new BadRequestException("At least one field must be provided");
        }
        User user = findUser(userId);
        if (update.firstName() != null) {
            user.setFirstName(update.firstName());
        }
        if (update.lastName() != null) {
            user.setLastName(update.lastName());
        }
        if (update.phoneSet()) {
            user.setPhone(update.phone());
        }
        return toProfile(user);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private TokenPair issueTokens(User user) {
        JwtProvider.IssuedToken access = jwtProvider.generateAccessToken(user.getId(), user.getRole().name());
        String refreshJti = UUID.randomUUID().toString();
        JwtProvider.IssuedToken refresh = jwtProvider.generateRefreshToken(user.getId(), refreshJti);
        refreshTokenRepository.save(RefreshToken.issue(user.getId(), refreshJti, refresh.expiresAt()));
        return new TokenPair(access.value(), jwtProperties.accessTtlSeconds(),
                refresh.value(), jwtProperties.refreshTtlSeconds());
    }

    private UserProfile toProfile(User user) {
        return new UserProfile(user.getId(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(),
                UserProfile.UserRoleDto.valueOf(user.getRole().name()));
    }

    public record ProfileUpdate(String firstName, String lastName, String phone, boolean phoneSet) {

        public boolean isEmpty() {
            return firstName == null && lastName == null && !phoneSet;
        }
    }
}
