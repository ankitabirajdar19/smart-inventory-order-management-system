package com.inventorymanagement.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, String frontendUrl, Cors cors, Storage storage, Shipping shipping,
                            Order order, Payment payment, Cookie cookie, RateLimit rateLimit) {
    public record Jwt(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {}
    public record Cors(List<String> allowedOrigins) {}
    public record Storage(String localDir) {}
    public record Shipping(BigDecimal flatFee, BigDecimal freeThreshold) {}
    public record Order(Duration reservationTtl, long expiryCheckIntervalMs) {}
    public record Payment(boolean allowSimulation) {}
    public record Cookie(boolean secure, String sameSite) {}
    public record RateLimit(int authPerMinute) {}
}
