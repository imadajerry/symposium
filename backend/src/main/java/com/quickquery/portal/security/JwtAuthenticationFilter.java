package com.quickquery.portal.security;

import com.quickquery.portal.data.PortalRepository;
import com.quickquery.portal.model.ApiUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final PortalRepository repository;

  public JwtAuthenticationFilter(JwtService jwtService, PortalRepository repository) {
    this.jwtService = jwtService;
    this.repository = repository;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      Map<String, Object> payload = jwtService.parseToken(header.substring(7));
      Object subject = payload.get("sub");
      if (subject instanceof String id && SecurityContextHolder.getContext().getAuthentication() == null) {
        repository.findUserById(UUID.fromString(id)).ifPresent(this::authenticate);
      }
    }
    filterChain.doFilter(request, response);
  }

  private void authenticate(ApiUser user) {
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
        user,
        null,
        List.of(new SimpleGrantedAuthority("ROLE_" + user.role().toUpperCase()))
    );
    SecurityContextHolder.getContext().setAuthentication(auth);
  }
}
