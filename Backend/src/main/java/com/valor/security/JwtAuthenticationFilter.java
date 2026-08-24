package com.valor.security;

import com.valor.store.RecordStore;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final RecordStore store;
    public JwtAuthenticationFilter(JwtService jwtService, RecordStore store) { this.jwtService = jwtService; this.store = store; }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtService.claims(header.substring(7));
                String role = claims.get("role", String.class);
                role = role == null ? "" : role.trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
                if (!Set.of("ADMIN", "SUPER_ADMIN").contains(role) && isAdminSubject(claims.getSubject())) role = "ADMIN";
                var auth = new UsernamePasswordAuthenticationToken(claims.getSubject(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                auth.setDetails(claims);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean isAdminSubject(String subject) {
        return subject != null && store.list("admins").stream().anyMatch(admin -> subject.equalsIgnoreCase(String.valueOf(admin.get("email"))));
    }
}
