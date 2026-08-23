package com.practice.catalog.auth.service;

import com.practice.catalog.common.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_TYP = "typ";
    public static final String TYP_ACCESS = "access";
    public static final String TYP_REFRESH = "refresh";

    private final SecretKey key;
    private final JwtProperties props;

    public JwtProvider(JwtProperties props) {
        if (props.secret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
        this.props = props;
    }

    public IssuedToken generateAccessToken(UUID userId, String role) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(props.accessTtlSeconds());
        String token = Jwts.builder()
                .subject(userId.toString())
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYP, TYP_ACCESS)
                .id(UUID.randomUUID().toString())
                .issuer(props.issuer())
                .audience().add(props.audience()).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
        return new IssuedToken(token, exp);
    }

    public IssuedToken generateRefreshToken(UUID userId, String jti) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(props.refreshTtlSeconds());
        String token = Jwts.builder()
                .subject(userId.toString())
                .claim(CLAIM_TYP, TYP_REFRESH)
                .id(jti)
                .issuer(props.issuer())
                .audience().add(props.audience()).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
        return new IssuedToken(token, exp);
    }

    public ParsedAccess parseAccess(String rawToken) {
        Claims claims = parse(rawToken, TYP_ACCESS);
        String role = claims.get(CLAIM_ROLE, String.class);
        if (role == null) {
            throw new UnauthorizedException("Invalid access token");
        }
        return new ParsedAccess(UUID.fromString(claims.getSubject()), role, claims.getId());
    }

    public ParsedRefresh parseRefresh(String rawToken) {
        Claims claims = parse(rawToken, TYP_REFRESH);
        return new ParsedRefresh(UUID.fromString(claims.getSubject()), claims.getId());
    }

    private Claims parse(String rawToken, String expectedTyp) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(props.issuer())
                    .build()
                    .parseSignedClaims(rawToken)
                    .getPayload();
            if (!props.audience().equals(claims.getAudience().stream().findFirst().orElse(null))) {
                throw new UnauthorizedException("Invalid token audience");
            }
            if (!expectedTyp.equals(claims.get(CLAIM_TYP, String.class))) {
                throw new UnauthorizedException("Invalid token type");
            }
            return claims;
        } catch (JwtException | IllegalArgumentException e) {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }

    public record ParsedAccess(UUID userId, String role, String jti) {
    }

    public record ParsedRefresh(UUID userId, String jti) {
    }
}
