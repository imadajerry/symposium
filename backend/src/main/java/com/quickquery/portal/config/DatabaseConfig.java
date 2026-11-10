package com.quickquery.portal.config;

import java.net.URI;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import com.zaxxer.hikari.HikariDataSource;

@Configuration
public class DatabaseConfig {
  private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

  @Bean
  @Primary
  public DataSource dataSource(DataSourceProperties properties) {
    // Check for Neon unpooled direct URL first (recommended for Flyway migrations), then pooled
    String rawUrl = System.getenv("DATABASE_URL_UNPOOLED");
    if (rawUrl == null || rawUrl.isBlank()) {
      rawUrl = System.getenv("DATABASE_URL");
    }

    if (rawUrl != null && !rawUrl.isBlank()) {
      try {
        log.info("Detected cloud DATABASE_URL / DATABASE_URL_UNPOOLED. Parsing into JDBC datasource...");
        URI uri = URI.create(rawUrl.replace("jdbc:", ""));
        String userInfo = uri.getUserInfo();
        String username = properties.getUsername();
        String password = properties.getPassword();

        if (userInfo != null && userInfo.contains(":")) {
          String[] parts = userInfo.split(":", 2);
          username = parts[0];
          password = parts[1];
        }

        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath(); // e.g. /neondb
        String query = uri.getQuery(); // e.g. sslmode=require

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
            .append(host)
            .append(":")
            .append(port)
            .append(path);

        if (query != null && !query.isBlank()) {
          jdbcUrl.append("?").append(query);
        } else {
          jdbcUrl.append("?sslmode=require");
        }

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl.toString());
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName("org.postgresql.Driver");
        log.info("Configured dynamic JDBC datasource for host: {}", host);
        return ds;
      } catch (Exception e) {
        log.warn("Failed to parse DATABASE_URL: {}. Falling back to standard Spring datasource properties", e.getMessage());
      }
    }

    // Default fallback to application.yml properties
    return properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
  }
}
