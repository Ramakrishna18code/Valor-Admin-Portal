package com.valor.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {
    @GetMapping("/")
    public Map<String, Object> health() { return Map.of("service", "valor-admin-backend", "status", "UP", "timestamp", java.time.OffsetDateTime.now()); }
}
