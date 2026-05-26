package com.quickquery.portal.service;

import com.quickquery.portal.data.PortalRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Handles LLM-based content generation asynchronously so that file upload
 * requests return immediately instead of blocking for minutes while the
 * local model processes.
 */
@Service
public class ContentGenerationService {
  private static final Logger log = LoggerFactory.getLogger(ContentGenerationService.class);

  private final PortalRepository repository;
  private final OllamaService ollama;

  public ContentGenerationService(PortalRepository repository, OllamaService ollama) {
    this.repository = repository;
    this.ollama = ollama;
  }

  /**
   * Runs in a separate thread. Updates the syllabus status to "processed" or "failed"
   * once the LLM generation completes.
   */
  @Async
  public void generateContentAsync(UUID syllabusId, UUID subjectId, String syllabusText) {
    log.info("Starting async content generation for syllabus={} subject={}", syllabusId, subjectId);
    try {
      String contentJson = ollama.generateSyllabusContent(syllabusText);
      repository.saveGeneratedContent(subjectId, syllabusId, "ready_for_review", contentJson, null);
      repository.updateSyllabusStatus(syllabusId, "processed", null);
      log.info("Content generation completed for syllabus={}", syllabusId);
    } catch (Exception e) {
      log.error("Content generation failed for syllabus={}", syllabusId, e);
      repository.updateSyllabusStatus(syllabusId, "failed", e.getMessage());
    }
  }
}
