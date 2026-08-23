package com.practice.catalog.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByJti(String jti);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = current_timestamp where t.userId = ?1 and t.revokedAt is null")
    int revokeAllForUser(UUID userId);

    @Modifying
    long deleteByExpiresAtBefore(Instant threshold);
}
