package com.quickquery.portal.service;

import com.quickquery.portal.data.PortalRepository;
import com.quickquery.portal.model.ApiDtos.AuthResponse;
import com.quickquery.portal.model.ApiDtos.LoginRequest;
import com.quickquery.portal.model.ApiDtos.RegisterRequest;
import com.quickquery.portal.model.ApiUser;
import com.quickquery.portal.security.JwtService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {
  private final PortalRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(PortalRepository repository, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.repository = repository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public AuthResponse login(LoginRequest request) {
    PortalRepository.UserWithPassword match = repository.findUserWithPasswordByEmail(request.email())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
    if (!passwordEncoder.matches(request.password(), match.passwordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }
    return response(match.user());
  }

  public AuthResponse register(RegisterRequest request) {
    String role = request.role() == null || request.role().isBlank() ? "student" : request.role();
    if (!role.equals("student") && !role.equals("teacher") && !role.equals("admin")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
    }
    try {
      ApiUser user = repository.createUser(
          request.name(),
          request.email(),
          passwordEncoder.encode(request.password()),
          role,
          role.equals("teacher") ? "T" : role.equals("admin") ? "A" : "S"
      );
      return response(user);
    } catch (DuplicateKeyException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    }
  }

  private AuthResponse response(ApiUser user) {
    return new AuthResponse(jwtService.createToken(user.id().toString(), user.email(), user.role()), user);
  }
}
