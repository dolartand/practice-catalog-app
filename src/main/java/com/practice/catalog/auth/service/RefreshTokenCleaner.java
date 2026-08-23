package com.practice.catalog.auth.service;

import com.practice.catalog.auth.domain.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class RefreshTokenCleaner {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleaner.class);

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenCleaner(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Scheduled(cron = "${app.auth.refresh-cleanup-cron:0 0 4 * * *}")
    @Transactional
    public void cleanup() {
        long removed = refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
        if (removed > 0) {
            log.info("Cleaned up {} expired refresh tokens", removed);
        }
    }
}
