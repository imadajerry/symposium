package com.quickquery.portal.model;

import java.time.Instant;
import java.util.UUID;

public record ApiUser(
    UUID id,
    String name,
    String email,
    String role,
    String avatar,
    Instant createdAt
) {}
