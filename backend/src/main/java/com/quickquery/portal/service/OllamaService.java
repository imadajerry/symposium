package com.quickquery.portal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickquery.portal.config.QuickQueryProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OllamaService {
  private static final Logger log = LoggerFactory.getLogger(OllamaService.class);
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private final RestClient restClient;
  private final QuickQueryProperties properties;

  public OllamaService(QuickQueryProperties properties) {
    this.properties = properties;
    // 120s read timeout — local LLM generation can be slow but shouldn't hang forever
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(10_000);
    factory.setReadTimeout(120_000);
    this.restClient = RestClient.builder()
        .baseUrl(properties.ollamaUrl())
        .requestFactory(factory)
        .build();
  }

  public String generateSyllabusContent(String syllabusText) {
    String prompt = """
        Convert this syllabus into compact JSON with keys modules, topics, objectives, summaries, and suggestedStudyContent.
        Return JSON only. Syllabus:
        """ + "\n" + abbreviate(syllabusText, 12000);
    return generateJson(prompt, fallbackSyllabusJson(syllabusText));
  }

  public String answerStudentQuestion(String question, String approvedContext) {
    String prompt = """
        You are a helpful teaching assistant. Answer using the approved subject context when relevant.
        Keep the answer clear, concise, and educational.

        Approved context:
        """ + "\n" + abbreviate(approvedContext, 10000) + "\n\nStudent question:\n" + question;
    return generateText(prompt, "I could not reach the local LLM. Based on the available course context, please ask your teacher to review this question.");
  }

  private String generateJson(String prompt, String fallback) {
    try {
      Map<String, Object> request = new LinkedHashMap<>();
      request.put("model", properties.ollamaModel());
      request.put("prompt", prompt);
      request.put("stream", false);
      request.put("format", "json");
      JsonNode response = restClient.post()
          .uri("/api/generate")
          .contentType(MediaType.APPLICATION_JSON)
          .body(request)
          .retrieve()
          .body(JsonNode.class);
      String generated = response == null ? null : response.path("response").asText(null);
      if (generated == null || generated.isBlank()) return fallback;
      MAPPER.readTree(generated);
      return generated;
    } catch (Exception e) {
      log.warn("Ollama JSON generation failed (using fallback): {}", e.getMessage());
      return fallback;
    }
  }

  private String generateText(String prompt, String fallback) {
    try {
      Map<String, Object> request = new LinkedHashMap<>();
      request.put("model", properties.ollamaModel());
      request.put("prompt", prompt);
      request.put("stream", false);
      JsonNode response = restClient.post()
          .uri("/api/generate")
          .contentType(MediaType.APPLICATION_JSON)
          .body(request)
          .retrieve()
          .body(JsonNode.class);
      String generated = response == null ? null : response.path("response").asText(null);
      return generated == null || generated.isBlank() ? fallback : generated;
    } catch (Exception e) {
      log.warn("Ollama text generation failed (using fallback): {}", e.getMessage());
      return fallback;
    }
  }

  private String fallbackSyllabusJson(String syllabusText) {
    String summary = abbreviate(syllabusText == null || syllabusText.isBlank() ? "Uploaded syllabus" : syllabusText, 700);
    return """
        {
          "modules": [
            {
              "title": "Uploaded syllabus review",
              "topics": ["Initial syllabus analysis"],
              "objectives": ["Review uploaded syllabus", "Identify key learning needs"],
              "summary": %s,
              "suggestedStudyContent": ["Teacher review required before publishing generated material"]
            }
          ],
          "topics": ["Initial syllabus analysis"],
          "objectives": ["Review uploaded syllabus"],
          "summaries": [%s],
          "suggestedStudyContent": ["Teacher review required before publishing generated material"]
        }
        """.formatted(quote(summary), quote(summary));
  }

  private String quote(String value) {
    try {
      return MAPPER.writeValueAsString(value);
    } catch (Exception e) {
      return "\"\"";
    }
  }

  private String abbreviate(String value, int max) {
    if (value == null) return "";
    return value.length() <= max ? value : value.substring(0, max);
  }

  /** Quick health check — pings Ollama's /api/tags endpoint. */
  public boolean isAvailable() {
    try {
      restClient.get().uri("/api/tags").retrieve().body(JsonNode.class);
      return true;
    } catch (Exception e) {
      log.warn("Ollama health check failed: {}", e.getMessage());
      return false;
    }
  }
}
