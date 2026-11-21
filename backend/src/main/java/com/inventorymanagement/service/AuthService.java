package com.inventorymanagement.service;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.AuthDtos.*;
import com.inventorymanagement.entity.RefreshToken;
import com.inventorymanagement.entity.Role;
import com.inventorymanagement.entity.User;
import com.inventorymanagement.enums.UserStatus;
import com.inventorymanagement.exception.*;
import com.inventorymanagement.repository.*;
import com.inventorymanagement.security.JwtService;
import com.inventorymanagement.util.Hashing;
import jakarta.annotation.PostConstruct;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private static final int MAX_FAILED = 5;
    private static final Duration LOCK = Duration.ofMinutes(15);
    private final SecureRandom random = new SecureRandom();

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AppProperties props;
    private String dummyHash;

    public record Session(TokenResponse tokens, String refreshToken) {}

    @PostConstruct
    void init() { dummyHash = encoder.encode("not-a-real-password"); }

    @Transactional
    public UserResponse register(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw new DuplicateResourceException("An account with this email already exists");
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(r.password()));
        u.setFullName(r.fullName().trim());
        u.setPhone(r.phone());
        u.setStatus(UserStatus.ACTIVE);
        u.getRoles().add(roles.findByName("CUSTOMER").orElseThrow(() -> new IllegalStateException("CUSTOMER role missing")));
        u = users.save(u);
        log.info("User registered id={}", u.getId());
        return toResponse(u);
    }

    /** noRollbackFor: the failed-attempt counter must persist even though we throw. */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public Session login(LoginRequest r) {
        Instant now = Instant.now();
        User u = users.findByEmailIgnoreCaseAndDeletedAtIsNull(r.email().trim()).orElse(null);
        if (u == null) {
            encoder.matches(r.password(), dummyHash);   // equalise timing so unknown emails are not distinguishable
            throw new InvalidCredentialsException("Invalid email or password");
        }
        if (u.getLockedUntil() != null && u.getLockedUntil().isAfter(now))
            throw new InvalidCredentialsException("Too many failed attempts. Try again later");
        if (!encoder.matches(r.password(), u.getPasswordHash())) {
            int failed = u.getFailedLoginCount() + 1;
            if (failed >= MAX_FAILED) { u.setLockedUntil(now.plus(LOCK)); failed = 0; log.warn("Account locked userId={}", u.getId()); }
            u.setFailedLoginCount(failed);
            throw new InvalidCredentialsException("Invalid email or password");
        }
        if (u.getStatus() != UserStatus.ACTIVE) throw new InvalidCredentialsException("Account is not active");
        u.setFailedLoginCount(0);
        u.setLockedUntil(null);
        return issue(u, UUID.randomUUID().toString());
    }

    /** Rotation with reuse detection: replaying a revoked token revokes the whole token family. */
    @Transactional(noRollbackFor = InvalidTokenException.class)
    public Session refresh(String raw) {
        if (raw == null || raw.isBlank()) throw new InvalidTokenException("Missing refresh token");
        Instant now = Instant.now();
        RefreshToken t = refreshTokens.findByTokenHashForUpdate(Hashing.sha256Hex(raw)).orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));
        if (t.getRevokedAt() != null) {
            refreshTokens.revokeFamily(t.getFamilyId(), now);
            log.warn("Refresh token reuse detected, family revoked userId={}", t.getUserId());
            throw new InvalidTokenException("Invalid refresh token");
        }
        if (t.getExpiresAt().isBefore(now)) throw new InvalidTokenException("Refresh token expired");
        User u = users.findById(t.getUserId()).filter(x -> x.getStatus() == UserStatus.ACTIVE && x.getDeletedAt() == null)
            .orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));
        String newRaw = newRawToken();
        t.setRevokedAt(now);
        t.setReplacedByHash(Hashing.sha256Hex(newRaw));
        persist(u.getId(), t.getFamilyId(), newRaw);
        return new Session(tokens(u), newRaw);
    }

    @Transactional
    public void logout(String raw) {
        if (raw == null || raw.isBlank()) return;
        refreshTokens.findByTokenHashForUpdate(Hashing.sha256Hex(raw))
            .ifPresent(t -> refreshTokens.revokeFamily(t.getFamilyId(), Instant.now()));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest r) {
        User u = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!encoder.matches(r.currentPassword(), u.getPasswordHash())) throw new InvalidCredentialsException("Current password is incorrect");
        u.setPasswordHash(encoder.encode(r.newPassword()));
        refreshTokens.revokeAllForUser(userId, Instant.now());   // sign out everywhere
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return toResponse(users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest r) {
        User u = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        u.setFullName(r.fullName().trim());
        u.setPhone(r.phone());
        return toResponse(u);
    }

    private Session issue(User u, String family) {
        String raw = newRawToken();
        persist(u.getId(), family, raw);
        return new Session(tokens(u), raw);
    }

    private void persist(Long userId, String family, String raw) {
        RefreshToken n = new RefreshToken();
        n.setUserId(userId);
        n.setFamilyId(family);
        n.setTokenHash(Hashing.sha256Hex(raw));
        n.setExpiresAt(Instant.now().plus(props.jwt().refreshTokenTtl()));
        refreshTokens.save(n);
    }

    private TokenResponse tokens(User u) { return new TokenResponse(jwt.generate(u.getId(), u.getEmail()), jwt.ttlSeconds(), toResponse(u)); }

    private String newRawToken() {
        byte[] b = new byte[32];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private UserResponse toResponse(User u) {
        Set<String> roleNames = u.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        Set<String> perms = u.getRoles().stream().flatMap(r -> r.getPermissions().stream()).map(p -> p.getName()).collect(Collectors.toSet());
        return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), roleNames, perms);
    }
}
