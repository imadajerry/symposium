package com.quickquery.portal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quickquery")
public record QuickQueryProperties(
    String jwtSecret,
    long tokenTtlSeconds,
    String uploadDir,
    String ollamaUrl,
    String ollamaModel,
    String corsOrigins
) {}
