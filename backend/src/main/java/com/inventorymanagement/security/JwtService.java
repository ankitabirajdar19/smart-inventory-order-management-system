package com.inventorymanagement.security;

import com.inventorymanagement.config.AppProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtService {
    private final SecretKey key;
    private final Duration ttl;

    public JwtService(AppProperties props) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        this.key = Keys.hmacShaKeyFor(secret);
        this.ttl = props.jwt().accessTokenTtl();
    }

    public String generate(Long userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder().subject(String.valueOf(userId)).claim("email", email)
            .issuedAt(Date.from(now)).expiration(Date.from(now.plus(ttl))).signWith(key).compact();
    }

    public long ttlSeconds() { return ttl.toSeconds(); }

    /** Verifies signature and expiry; throws JwtException on any problem. */
    public Long parseUserId(String token) {
        return Long.valueOf(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
    }
}
