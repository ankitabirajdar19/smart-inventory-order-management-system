package com.inventorymanagement.security;

import com.inventorymanagement.config.AppProperties;
import com.benmanes.caffeine.cache.Cache;
import com.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.springframework.http.HttpMethod;
import org.springframework.web.filter.OncePerRequestFilter;

/** Per-IP rate limit on login/register (in-memory; use a shared store such as Redis if you run multiple instances). */
public class RateLimitFilter extends OncePerRequestFilter {
    private final int perMinute;
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .expireAfterAccess(Duration.ofMinutes(10)).maximumSize(50_000).build();

    public RateLimitFilter(AppProperties props) { this.perMinute = props.rateLimit().authPerMinute(); }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest r) {
        String p = r.getRequestURI();
        return !(HttpMethod.POST.matches(r.getMethod()) && (p.endsWith("/auth/login") || p.endsWith("/auth/register")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Bucket b = buckets.get(req.getRemoteAddr(), k -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(perMinute).refillIntervally(perMinute, Duration.ofMinutes(1)).build()).build());
        if (b.tryConsume(1)) { chain.doFilter(req, res); return; }
        res.setStatus(429);
        res.setHeader("Retry-After", "60");
        res.setContentType("application/json");
        res.getWriter().write("{\"status\":429,\"code\":\"RATE_LIMITED\",\"message\":\"Too many attempts, try again in a minute\"}");
    }
}
