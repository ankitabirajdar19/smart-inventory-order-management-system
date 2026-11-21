package com.inventorymanagement.dto;

import jakarta.validation.constraints.*;
import java.util.Set;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message = "must be 8-72 chars with a letter and a digit") String password,
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 20) String phone) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword,
        @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message = "must be 8-72 chars with a letter and a digit") String newPassword) {}
    public record UpdateProfileRequest(@NotBlank @Size(max = 150) String fullName, @Size(max = 20) String phone) {}
    public record UserResponse(Long id, String email, String fullName, String phone, Set<String> roles, Set<String> permissions) {}
    public record TokenResponse(String accessToken, long expiresInSeconds, UserResponse user) {}
}
