package com.quickquery.portal.web;

import com.quickquery.portal.model.ApiDtos.AuthResponse;
import com.quickquery.portal.model.ApiDtos.LoginRequest;
import com.quickquery.portal.model.ApiDtos.RegisterRequest;
import com.quickquery.portal.model.ApiUser;
import com.quickquery.portal.service.AuthService;
import com.quickquery.portal.service.OllamaService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final AuthService authService;
  private final OllamaService ollamaService;

  public AuthController(AuthService authService, OllamaService ollamaService) {
    this.authService = authService;
    this.ollamaService = ollamaService;
  }

  @GetMapping("/health")
  public HealthStatus health() {
    boolean llmAvailable = ollamaService.isAvailable();
    return new HealthStatus("ok", llmAvailable ? "connected" : "unavailable");
  }

  @PostMapping("/auth/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/auth/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @GetMapping("/me")
  public ApiUser me(@AuthenticationPrincipal ApiUser user) {
    return user;
  }

  public record HealthStatus(String status, String llm) {}
}
