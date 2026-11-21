package com.inventorymanagement.security;

import com.inventorymanagement.entity.Role;
import com.inventorymanagement.enums.UserStatus;
import com.inventorymanagement.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Authorities are loaded from the DB on every request, so role changes and deactivation take effect immediately. */
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) { this.jwt = jwt; this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Long id = jwt.parseUserId(header.substring(7));
                users.findById(id)
                    .filter(u -> u.getStatus() == UserStatus.ACTIVE && u.getDeletedAt() == null)
                    .ifPresent(u -> {
                        List<GrantedAuthority> auth = new ArrayList<>();
                        for (Role r : u.getRoles()) {
                            auth.add(new SimpleGrantedAuthority("ROLE_" + r.getName()));
                            r.getPermissions().forEach(p -> auth.add(new SimpleGrantedAuthority(p.getName())));
                        }
                        SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(new AuthUser(u.getId(), u.getEmail()), null, auth));
                    });
            } catch (JwtException | IllegalArgumentException ignored) {
                // invalid/expired token: continue unauthenticated, the entry point returns 401
            }
        }
        chain.doFilter(req, res);
    }
}
