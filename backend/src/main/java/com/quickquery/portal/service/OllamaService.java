package com.quickquery.portal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickquery.portal.config.QuickQueryProperties;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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

  /** Maximum chars of syllabus text forwarded to the LLM. */
  private static final int SYLLABUS_MAX_CHARS = 12_000;

  /** Maximum chars of Q&A context assembled from approved materials. */
  private static final int QA_CONTEXT_MAX_CHARS = 6_000;

  /** Approximate size of each chunk when splitting approved context (improvement 7). */
  private static final int CHUNK_SIZE = 500;

  /** Number of top-scoring chunks used as Q&A context (improvement 7). */
  private static final int TOP_CHUNKS = 8;

  private final RestClient restClient;
  private final RestClient geminiRestClient;
  private final QuickQueryProperties properties;

  public OllamaService(QuickQueryProperties properties) {
    this.properties = properties;
    // 120 s read timeout — local LLM generation can be slow but shouldn't hang forever
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(10_000);
    factory.setReadTimeout(240_000);  // 4 min — 4096-token output needs more time
    this.restClient = RestClient.builder()
        .baseUrl(properties.ollamaUrl())
        .requestFactory(factory)
        .build();
    this.geminiRestClient = RestClient.builder()
        .baseUrl("https://generativelanguage.googleapis.com")
        .requestFactory(factory)
        .build();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Improvement 5: Ask the LLM to produce a flattened modules-only schema.
   *
   * @return a {@link GeneratedJson} containing the raw LLM output and a normalised JSON string
   *         that always conforms to {@code {"modules":[…]}}. The raw string is stored for
   *         debugging; the normalised string is stored as {@code content_json} (improvement 6).
   */
  public GeneratedJson generateSyllabusContent(String syllabusText) {
    String prompt = """
        You are a curriculum data extractor. Your ONLY job is to read the syllabus below and
        convert it into JSON. Do NOT summarize, do NOT paraphrase, do NOT invent content.
        Copy topic names and subtopics exactly as they appear in the syllabus.

        Output ONLY valid JSON — no explanation, no markdown, no code fences. Use this schema:
        {
          "modules": [
            {
              "title": "<Unit/Module title exactly as written, e.g. Unit I: Introduction to Python>",
              "weightagePercent": <hours or marks weight as a number, 0 if not stated>,
              "topics": [
                "<subtopic exactly as written>",
                "<subtopic exactly as written>"
              ],
              "learningObjectives": ["<objective verbatim from syllabus>"],
              "summary": "<one sentence describing what this unit covers>",
              "suggestedResources": ["<textbook or reference listed in syllabus>"]
            }
          ]
        }

        CRITICAL RULES:
        - One module object per Unit/Module/Chapter found in the syllabus.
        - The topics array MUST list every subtopic and sub-subtopic from that unit. Do not merge or skip any.
        - Copy topic names verbatim — do not rephrase.
        - If the syllabus has 5 units, the modules array must have exactly 5 objects.
        - suggestedResources should list actual book/reference names from the syllabus if present.
        - weightagePercent values must sum to approximately 100.
        - Do NOT output anything outside the JSON object.

        Syllabus text:
        """ + "\n" + abbreviate(syllabusText, SYLLABUS_MAX_CHARS);

    String fallback = fallbackSyllabusJson(syllabusText);
    return generateJsonWithRaw(prompt, fallback);
  }

  /**
   * Improvement 7: Answer a student question using chunked, relevance-ranked approved context
   * instead of passing the full raw JSON blob.
   */
  public String answerStudentQuestion(String question, String subjectTitle, String approvedContextRaw) {
    // If there's no approved content at all, don't let the LLM hallucinate a random course
    if (approvedContextRaw == null || approvedContextRaw.isBlank()) {
      return "No approved course materials are available yet for this subject. " +
          "Please ask your teacher to upload and approve the syllabus content before using the AI assistant.";
    }

    String relevantContext = buildRelevantContext(question, approvedContextRaw);

    String prompt = """
        You are a helpful teaching assistant for the course "%s".
        Answer the student's question using ONLY the course context provided below.
        Do NOT use your general knowledge — if the context does not cover the topic,
        say "This topic is not covered in the approved course materials" instead of guessing.

        Course context:
        """ .formatted(subjectTitle != null ? subjectTitle : "Unknown Course")
        + "\n" + relevantContext + "\n\nStudent question:\n" + question;

    return generateText(prompt, "I could not reach the local LLM. Please ask your teacher to clarify this question.");
  }

  public boolean hasGemini() {
    return properties.geminiApiKey() != null && !properties.geminiApiKey().isBlank();
  }

  /** Quick health check — checks Gemini API key presence or pings Ollama's /api/tags endpoint. */
  public boolean isAvailable() {
    if (hasGemini()) {
      return true;
    }
    try {
      restClient.get().uri("/api/tags").retrieve().body(JsonNode.class);
      return true;
    } catch (Exception e) {
      log.warn("Ollama health check failed: {}", e.getMessage());
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Improvement 7: context chunking & relevance ranking
  // -------------------------------------------------------------------------

  /**
   * Splits the raw approved-content JSON blobs into ~500-char text chunks,
   * scores each chunk against the question's keywords, and returns the top-N
   * chunks concatenated (up to {@link #QA_CONTEXT_MAX_CHARS} chars).
   */
  private String buildRelevantContext(String question, String rawJson) {
    if (rawJson == null || rawJson.isBlank()) return "";

    Set<String> keywords = extractKeywords(question);
    List<String> chunks = new ArrayList<>();

    // rawJson may be multiple JSON blobs concatenated with newlines
    for (String blob : rawJson.split("\\n\\n+")) {
      chunks.addAll(splitToChunks(flattenJsonToText(blob)));
    }

    if (chunks.isEmpty()) return abbreviate(rawJson, QA_CONTEXT_MAX_CHARS);

    // Score each chunk by keyword overlap (simple TF-style)
    record Scored(String text, long score) {}
    List<Scored> scored = chunks.stream()
        .map(chunk -> {
          String lower = chunk.toLowerCase();
          long hits = keywords.stream().filter(lower::contains).count();
          return new Scored(chunk, hits);
        })
        .sorted((a, b) -> Long.compare(b.score(), a.score()))
        .toList();

    StringBuilder context = new StringBuilder();
    for (int i = 0; i < Math.min(TOP_CHUNKS, scored.size()); i++) {
      String chunk = scored.get(i).text();
      if (context.length() + chunk.length() > QA_CONTEXT_MAX_CHARS) break;
      context.append(chunk).append("\n\n");
    }
    return context.toString().trim();
  }

  /** Very lightweight keyword extractor — splits on whitespace and removes stop words. */
  private Set<String> extractKeywords(String question) {
    Set<String> stopWords = Set.of(
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "what", "how", "why", "when", "where", "who", "which", "that", "this",
        "i", "me", "my", "you", "your", "we", "our", "in", "on", "at", "to", "of",
        "and", "or", "but", "not", "for", "with", "can", "please", "explain"
    );
    return Arrays.stream(question.toLowerCase().split("[^a-z0-9]+"))
        .filter(w -> w.length() > 2 && !stopWords.contains(w))
        .collect(Collectors.toSet());
  }

  /** Flatten a JSON blob to a plain-text string that is useful for context. */
  private String flattenJsonToText(String jsonBlob) {
    try {
      JsonNode root = MAPPER.readTree(jsonBlob);
      StringBuilder sb = new StringBuilder();
      flattenNode(root, sb);
      return sb.toString().trim();
    } catch (Exception e) {
      return jsonBlob;
    }
  }

  private void flattenNode(JsonNode node, StringBuilder sb) {
    if (node.isTextual()) {
      sb.append(node.asText()).append(' ');
    } else if (node.isArray()) {
      node.forEach(child -> flattenNode(child, sb));
    } else if (node.isObject()) {
      node.fields().forEachRemaining(entry -> {
        sb.append(entry.getKey()).append(": ");
        flattenNode(entry.getValue(), sb);
        sb.append('\n');
      });
    } else if (!node.isNull()) {
      sb.append(node.asText()).append(' ');
    }
  }

  /** Split a long text into chunks of roughly {@link #CHUNK_SIZE} chars at sentence boundaries. */
  private List<String> splitToChunks(String text) {
    List<String> chunks = new ArrayList<>();
    if (text == null || text.isBlank()) return chunks;
    String[] sentences = text.split("(?<=[.!?\\n])\\s+");
    StringBuilder current = new StringBuilder();
    for (String sentence : sentences) {
      if (current.length() + sentence.length() > CHUNK_SIZE && !current.isEmpty()) {
        chunks.add(current.toString().trim());
        current = new StringBuilder();
      }
      current.append(sentence).append(' ');
    }
    if (!current.isEmpty()) chunks.add(current.toString().trim());
    return chunks;
  }

  // -------------------------------------------------------------------------
  // Core LLM methods (Gemini + Ollama hybrid)
  // -------------------------------------------------------------------------

  /**
   * Generates structured JSON using Gemini Flash (if configured) or Ollama.
   *
   * @return a {@link GeneratedJson} containing the raw LLM output and normalized JSON string.
   */
  private GeneratedJson generateJsonWithRaw(String prompt, String fallbackJson) {
    if (hasGemini()) {
      return generateGeminiJson(prompt, fallbackJson);
    }
    return generateOllamaJsonWithRaw(prompt, fallbackJson);
  }

  private String generateText(String prompt, String fallback) {
    if (hasGemini()) {
      return generateGeminiText(prompt, fallback);
    }
    return generateOllamaText(prompt, fallback);
  }

  private GeneratedJson generateGeminiJson(String prompt, String fallbackJson) {
    try {
      String model = properties.geminiModel() != null && !properties.geminiModel().isBlank()
          ? properties.geminiModel()
          : "gemini-1.5-flash";

      Map<String, Object> part = Map.of("text", prompt);
      Map<String, Object> content = Map.of("parts", List.of(part));
      Map<String, Object> generationConfig = Map.of(
          "temperature", 0.1,
          "responseMimeType", "application/json"
      );

      Map<String, Object> request = Map.of(
          "contents", List.of(content),
          "generationConfig", generationConfig
      );

      String responseBody = geminiRestClient.post()
          .uri("/v1beta/models/" + model + ":generateContent?key=" + properties.geminiApiKey())
          .contentType(MediaType.APPLICATION_JSON)
          .body(request)
          .retrieve()
          .body(String.class);

      if (responseBody == null || responseBody.isBlank()) {
        log.warn("Gemini returned empty body; trying Ollama/fallback");
        return generateOllamaJsonWithRaw(prompt, fallbackJson);
      }

      JsonNode responseNode = MAPPER.readTree(responseBody);
      JsonNode candidates = responseNode.path("candidates");
      if (!candidates.isArray() || candidates.isEmpty()) {
        log.warn("Gemini returned no candidates; trying Ollama/fallback");
        return generateOllamaJsonWithRaw(prompt, fallbackJson);
      }

      String raw = candidates.get(0).path("content").path("parts").get(0).path("text").asText(null);
      if (raw == null || raw.isBlank()) {
        log.warn("Gemini response text is blank; trying Ollama/fallback");
        return generateOllamaJsonWithRaw(prompt, fallbackJson);
      }

      // Validate JSON
      try {
        MAPPER.readTree(raw);
      } catch (Exception parseEx) {
        log.warn("Gemini output is not valid JSON (using fallback). Raw: {}", raw);
        return new GeneratedJson(raw, fallbackJson);
      }

      log.info("Successfully extracted syllabus JSON via Gemini model {}", model);
      return new GeneratedJson(raw, raw);

    } catch (Exception e) {
      log.warn("Gemini JSON generation failed (falling back to Ollama or default): {}", e.getMessage());
      return generateOllamaJsonWithRaw(prompt, fallbackJson);
    }
  }

  private String generateGeminiText(String prompt, String fallback) {
    try {
      String model = properties.geminiModel() != null && !properties.geminiModel().isBlank()
          ? properties.geminiModel()
          : "gemini-1.5-flash";

      Map<String, Object> part = Map.of("text", prompt);
      Map<String, Object> content = Map.of("parts", List.of(part));
      Map<String, Object> generationConfig = Map.of(
          "temperature", 0.3
      );

      Map<String, Object> request = Map.of(
          "contents", List.of(content),
          "generationConfig", generationConfig
      );

      String responseBody = geminiRestClient.post()
          .uri("/v1beta/models/" + model + ":generateContent?key=" + properties.geminiApiKey())
          .contentType(MediaType.APPLICATION_JSON)
          .body(request)
          .retrieve()
          .body(String.class);

      if (responseBody == null || responseBody.isBlank()) {
        return generateOllamaText(prompt, fallback);
      }

      JsonNode responseNode = MAPPER.readTree(responseBody);
      JsonNode candidates = responseNode.path("candidates");
      if (!candidates.isArray() || candidates.isEmpty()) {
        return generateOllamaText(prompt, fallback);
      }

      String text = candidates.get(0).path("content").path("parts").get(0).path("text").asText(null);
      return text == null || text.isBlank() ? generateOllamaText(prompt, fallback) : text;

    } catch (Exception e) {
      log.warn("Gemini text generation failed (falling back to Ollama or default): {}", e.getMessage());
      return generateOllamaText(prompt, fallback);
    }
  }

  /**
   * Improvement 6: returns both the raw LLM string AND the validated/normalised JSON
   * so the caller can persist both separately.
   */
  private GeneratedJson generateOllamaJsonWithRaw(String prompt, String fallbackJson) {
    try {
      Map<String, Object> options = new LinkedHashMap<>();
      options.put("num_ctx", 4096);
      options.put("num_predict", 2048);
      options.put("temperature", 0.1);

      Map<String, Object> request = new LinkedHashMap<>();
      request.put("model", properties.ollamaModel());
      request.put("prompt", prompt);
      request.put("stream", false);
      request.put("format", "json");
      request.put("options", options);

      String responseBody = restClient.post()
          .uri("/api/generate")
          .contentType(MediaType.APPLICATION_JSON)
          .body(request)
          .retrieve()
          .body(String.class);

      if (responseBody == null || responseBody.isBlank()) {
        log.warn("Ollama returned empty body; using fallback");
        return new GeneratedJson(null, fallbackJson);
      }

      JsonNode responseNode;
      try {
        responseNode = MAPPER.readTree(responseBody);
      } catch (Exception e) {
        log.warn("Ollama response is not JSON ({} chars): {}…", responseBody.length(),
            responseBody.substring(0, Math.min(300, responseBody.length())));
        return new GeneratedJson(null, fallbackJson);
      }

      if (responseNode.has("error")) {
        log.warn("Ollama returned error: {}", responseNode.path("error").asText());
        return new GeneratedJson(null, fallbackJson);
      }

      String raw = responseNode.path("response").asText(null);
      if (raw == null || raw.isBlank()) {
        log.warn("Ollama response field is blank; using fallback");
        return new GeneratedJson(null, fallbackJson);
      }

      try {
        MAPPER.readTree(raw);
      } catch (Exception parseEx) {
        log.warn("LLM output is not valid JSON (using fallback). Raw: {}", raw);
        return new GeneratedJson(raw, fallbackJson);
      }

      return new GeneratedJson(raw, raw);

    } catch (Exception e) {
      log.warn("Ollama JSON generation failed (using fallback): {}", e.getMessage());
      return new GeneratedJson(null, fallbackJson);
    }
  }

  private String generateOllamaText(String prompt, String fallback) {
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

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Improvement 5: clean fallback that matches the flattened modules-only schema. */
  private String fallbackSyllabusJson(String syllabusText) {
    String summary = abbreviate(
        syllabusText == null || syllabusText.isBlank() ? "Uploaded syllabus" : syllabusText, 700);
    return """
        {
          "modules": [
            {
              "title": "Uploaded Syllabus — Pending Review",
              "weightagePercent": 100,
              "topics": ["Initial syllabus analysis"],
              "learningObjectives": ["Review uploaded syllabus", "Identify key learning needs"],
              "summary": %s,
              "suggestedResources": ["Teacher review required before publishing generated material"]
            }
          ]
        }
        """.formatted(quote(summary));
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

  // -------------------------------------------------------------------------
  // Record types
  // -------------------------------------------------------------------------

  /**
   * Improvement 6: wraps the raw LLM string alongside the normalised JSON so that
   * {@link ContentGenerationService} can persist both independently.
   *
   * @param rawLlmResponse the unmodified string returned by Ollama (may be null on error/fallback)
   * @param contentJson    the validated JSON to store as {@code content_json}
   */
  public record GeneratedJson(String rawLlmResponse, String contentJson) {}
}
