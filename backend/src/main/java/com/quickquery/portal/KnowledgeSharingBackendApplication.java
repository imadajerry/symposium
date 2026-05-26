package com.quickquery.portal;

import com.quickquery.portal.data.PortalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableAsync
public class KnowledgeSharingBackendApplication {
  private static final Logger log = LoggerFactory.getLogger(KnowledgeSharingBackendApplication.class);

  public static void main(String[] args) {
    SpringApplication.run(KnowledgeSharingBackendApplication.class, args);
  }

  @Bean
  CommandLineRunner seedDemoData(PortalRepository repository, PasswordEncoder passwordEncoder) {
    return args -> {
      repository.seedDemoData(passwordEncoder);
      int reset = repository.resetStaleSyllabi();
      if (reset > 0) {
        log.info("Reset {} syllabi stuck in 'processing' from a previous run", reset);
      }
    };
  }
}
