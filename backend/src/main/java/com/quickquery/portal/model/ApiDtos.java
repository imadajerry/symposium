package com.quickquery.portal.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ApiDtos {
  private ApiDtos() {}

  public record AuthResponse(String token, ApiUser user) {}
  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
  public record RegisterRequest(@NotBlank String name, @Email @NotBlank String email, @NotBlank String password, String role) {}

  public record ClassGroup(UUID id, String name, String description, UUID createdBy, Instant createdAt) {}
  public record CreateClassRequest(@NotBlank String name, String description) {}
  public record Subject(UUID id, UUID classId, String title, String description, UUID createdBy, Instant createdAt) {}
  public record CreateSubjectRequest(UUID classId, @NotBlank String title, String description) {}
  public record EnrollmentRequest(@NotNull UUID userId, String role) {}
  public record UserSummary(UUID id, String name, String email, String role, String avatar) {}
  public record UpdateRoleRequest(String role) {}
  public record AdminStats(int totalUsers, int totalClasses, int totalSubjects, int totalQuestions, int totalUnderstandingEntries) {}
  public record EnrolledUser(UUID id, String name, String email, String role, String avatar, String enrollmentRole) {}

  public record Syllabus(UUID id, UUID subjectId, String fileName, String contentType, String status, String errorMessage, Instant createdAt, Integer charCount, Boolean isTruncated) {}
  public record Material(UUID id, UUID subjectId, String title, String fileName, String contentType, Instant createdAt) {}
  public record GeneratedContent(UUID id, UUID subjectId, UUID syllabusId, String status, String contentJson, String errorMessage, Instant createdAt, Instant updatedAt) {}
  public record UpdateGeneratedContentRequest(String status, String contentJson) {}

  /** A canonical topic extracted from approved generated content (improvement 1 & 2). */
  public record SyllabusTopic(
      UUID id,
      UUID subjectId,
      UUID generatedContentId,
      String moduleTitle,
      String topicName,
      int sortOrder,
      LocalDate coveredOn,       // null = not yet covered (improvement 2)
      Instant createdAt
  ) {}

  public record Question(UUID id, UUID subjectId, UUID userId, String authorName, String authorRole, String content, int upvotes, boolean isAnswered, Instant createdAt, List<Reply> replies) {}
  public record Reply(UUID id, UUID questionId, UUID userId, String authorName, String authorRole, String content, Instant createdAt) {}
  public record CreateTextRequest(@NotBlank String content) {}

  public record Conversation(UUID id, UUID subjectId, UUID ownerId, String ownerName, String title, String scope, Instant createdAt, List<Message> messages) {}
  public record CreateConversationRequest(UUID subjectId, @NotBlank String title, String scope) {}
  public record Message(UUID id, UUID conversationId, UUID senderId, String senderName, String senderType, String content, Instant createdAt) {}

  public record UnderstandingRequest(@NotBlank String topic, UUID topicId, @NotBlank String level, String note, List<String> tags) {}
  public record UnderstandingEntry(UUID id, UUID subjectId, UUID studentId, String studentName, String topic, UUID topicId, String level, String note, List<String> tags, Instant createdAt) {}

  /**
   * Enhanced analytics (improvement 3): adds trend over time, participation rate, per-topic tag breakdown.
   */
  public record UnderstandingAnalytics(
      double averageScore,
      int totalEntries,
      double participationRate,               // distinct students / enrolled students
      List<TopicUnderstanding> topics,
      List<TagCount> tags,
      List<UnderstandingEntry> recentLowEntries,
      List<WeeklyTrend> weeklyTrend           // improvement 3: trend over time
  ) {}

  public record TopicUnderstanding(String topic, double averageScore, int totalEntries) {}
  public record TagCount(String tag, int count) {}

  /** Improvement 3: weekly average score and entry count for trend charts. */
  public record WeeklyTrend(String weekStart, double averageScore, int entryCount) {}
}
