package com.inventorymanagement.security;

/** Authenticated principal placed in the SecurityContext. */
public record AuthUser(Long id, String email) {}
