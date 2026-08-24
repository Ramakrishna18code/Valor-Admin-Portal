package com.valor.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationHours;

    public JwtService(@Value("${valor.jwt.secret}") String secret, @Value("${valor.jwt.expiration-hours:12}") long expirationHours) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(raw.length >= 32 ? raw : Decoders.BASE64.decode(java.util.Base64.getEncoder().encodeToString(java.util.Arrays.copyOf(raw, 32))));
        this.expirationHours = expirationHours;
    }

    public String create(String subject, String role, String name) {
        Instant now = Instant.now();
        return Jwts.builder().subject(subject).claim("role", role).claim("name", name)
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(expirationHours * 3600)))
                .signWith(key).compact();
    }

    public Claims claims(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
}
