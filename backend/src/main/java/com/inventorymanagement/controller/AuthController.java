package com.inventorymanagement.controller;

import com.inventorymanagement.config.AppProperties;
import com.inventorymanagement.dto.ApiResponse;
import com.inventorymanagement.dto.AuthDtos.*;
import com.inventorymanagement.security.AuthUser;
import com.inventorymanagement.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AuthController {
    private static final String COOKIE = "refresh_token";
    private final AuthService auth;
    private final AppProperties props;

    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest r) { return ApiResponse.ok("Registered", auth.register(r)); }

    @PostMapping("/auth/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest r, HttpServletResponse res) {
        var s = auth.login(r);
        setCookie(res, s.refreshToken(), props.jwt().refreshTokenTtl());
        return ApiResponse.ok(s.tokens());
    }

    @PostMapping("/auth/refresh")
    public ApiResponse<TokenResponse> refresh(@CookieValue(name = COOKIE, required = false) String raw, HttpServletResponse res) {
        var s = auth.refresh(raw);
        setCookie(res, s.refreshToken(), props.jwt().refreshTokenTtl());
        return ApiResponse.ok(s.tokens());
    }

    @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name = COOKIE, required = false) String raw, HttpServletResponse res) {
        auth.logout(raw);
        setCookie(res, "", Duration.ZERO);
    }

    @GetMapping("/users/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal AuthUser u) { return ApiResponse.ok(auth.me(u.id())); }

    @PutMapping("/users/me")
    public ApiResponse<UserResponse> update(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody UpdateProfileRequest r) { return ApiResponse.ok(auth.updateProfile(u.id(), r)); }

    @PutMapping("/users/me/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody ChangePasswordRequest r) { auth.changePassword(u.id(), r); }

    private void setCookie(HttpServletResponse res, String value, Duration maxAge) {
        ResponseCookie c = ResponseCookie.from(COOKIE, value).httpOnly(true).secure(props.cookie().secure())
            .sameSite(props.cookie().sameSite()).path("/api/v1/auth").maxAge(maxAge).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }
}
