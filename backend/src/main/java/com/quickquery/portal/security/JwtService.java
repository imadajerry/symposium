package com.quickquery.portal.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickquery.portal.config.QuickQueryProperties;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private final QuickQueryProperties properties;

  public JwtService(QuickQueryProperties properties) {
    this.properties = properties;
  }

  public String createToken(String userId, String email, String role) {
    long now = Instant.now().getEpochSecond();
    Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("sub", userId);
    payload.put("email", email);
    payload.put("role", role);
    payload.put("iat", now);
    payload.put("exp", now + properties.tokenTtlSeconds());
    String unsigned = encode(header) + "." + encode(payload);
    return unsigned + "." + sign(unsigned);
  }

  public Map<String, Object> parseToken(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) {
        return Map.of();
      }
      String unsigned = parts[0] + "." + parts[1];
      if (!constantTimeEquals(sign(unsigned), parts[2])) {
        return Map.of();
      }
      Map<String, Object> payload = MAPPER.readValue(Base64.getUrlDecoder().decode(parts[1]), new TypeReference<>() {});
      Number exp = (Number) payload.get("exp");
      if (exp == null || exp.longValue() < Instant.now().getEpochSecond()) {
        return Map.of();
      }
      return payload;
    } catch (Exception ignored) {
      return Map.of();
    }
  }

  private String encode(Object value) {
    try {
      return Base64.getUrlEncoder().withoutPadding().encodeToString(MAPPER.writeValueAsBytes(value));
    } catch (Exception e) {
      throw new IllegalStateException("Unable to encode JWT", e);
    }
  }

  private String sign(String unsigned) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(properties.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException("Unable to sign JWT", e);
    }
  }

  private boolean constantTimeEquals(String a, String b) {
    if (a.length() != b.length()) return false;
    int result = 0;
    for (int i = 0; i < a.length(); i++) {
      result |= a.charAt(i) ^ b.charAt(i);
    }
    return result == 0;
  }
}
