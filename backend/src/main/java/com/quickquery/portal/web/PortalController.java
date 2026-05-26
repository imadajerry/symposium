package com.quickquery.portal.web;

import com.quickquery.portal.data.PortalRepository;
import com.quickquery.portal.model.ApiDtos.*;
import com.quickquery.portal.model.ApiUser;
import com.quickquery.portal.service.ContentGenerationService;
import com.quickquery.portal.service.FileStorageService;
import com.quickquery.portal.service.FileStorageService.StoredFile;
import com.quickquery.portal.service.OllamaService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PortalController {
  private final PortalRepository repository;
  private final FileStorageService fileStorage;
  private final OllamaService ollama;
  private final ContentGenerationService contentGeneration;

  public PortalController(PortalRepository repository, FileStorageService fileStorage, OllamaService ollama, ContentGenerationService contentGeneration) {
    this.repository = repository;
    this.fileStorage = fileStorage;
    this.ollama = ollama;
    this.contentGeneration = contentGeneration;
  }

  @GetMapping("/classes")
  public List<ClassGroup> classes(@AuthenticationPrincipal ApiUser user) {
    return repository.listClasses(user);
  }

  @PostMapping("/classes")
  public ClassGroup createClass(@AuthenticationPrincipal ApiUser user, @Valid @RequestBody CreateClassRequest request) {
    requireTeacher(user);
    return repository.createClass(request.name(), request.description(), user.id());
  }

  @GetMapping("/subjects")
  public List<Subject> subjects(@AuthenticationPrincipal ApiUser user) {
    return repository.listSubjects(user);
  }

  @PostMapping("/subjects")
  public Subject createSubject(@AuthenticationPrincipal ApiUser user, @Valid @RequestBody CreateSubjectRequest request) {
    requireTeacher(user);
    Subject subject = repository.createSubject(request.classId(), request.title(), request.description(), user.id());
    repository.enroll(subject.id(), user.id(), "teacher");
    return subject;
  }

  @PostMapping("/subjects/{subjectId}/enrollments")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void enroll(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId, @Valid @RequestBody EnrollmentRequest request) {
    requireTeacher(user);
    repository.enroll(subjectId, request.userId(), request.role());
  }

  @GetMapping("/subjects/{subjectId}/enrollments")
  public List<EnrolledUser> enrollments(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireTeacher(user);
    return repository.listEnrolledUsers(subjectId);
  }

  @DeleteMapping("/subjects/{subjectId}/enrollments/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void unenroll(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId, @PathVariable UUID userId) {
    requireTeacher(user);
    repository.unenroll(subjectId, userId);
  }

  @DeleteMapping("/subjects/{subjectId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteSubject(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireTeacher(user);
    ensureSubject(subjectId);
    repository.deleteSubject(subjectId);
  }

  @GetMapping("/users")
  public List<UserSummary> users(@AuthenticationPrincipal ApiUser user, @RequestParam(required = false) String search) {
    requireTeacher(user);
    return repository.listUsers(search);
  }

  @PatchMapping("/admin/users/{userId}/role")
  public void updateUserRole(@AuthenticationPrincipal ApiUser user, @PathVariable UUID userId, @Valid @RequestBody UpdateRoleRequest request) {
    requireAdmin(user);
    if (!List.of("student", "teacher", "admin").contains(request.role())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
    }
    repository.updateUserRole(userId, request.role());
  }

  @DeleteMapping("/admin/users/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteUser(@AuthenticationPrincipal ApiUser user, @PathVariable UUID userId) {
    requireAdmin(user);
    repository.deleteUser(userId);
  }

  @GetMapping("/admin/stats")
  public AdminStats adminStats(@AuthenticationPrincipal ApiUser user) {
    requireAdmin(user);
    return repository.getAdminStats();
  }

  @PostMapping("/subjects/{subjectId}/syllabi")
  public Syllabus uploadSyllabus(
      @AuthenticationPrincipal ApiUser user,
      @PathVariable UUID subjectId,
      @RequestParam(required = false) MultipartFile file,
      @RequestParam(required = false) String textContent
  ) {
    requireTeacher(user);
    ensureSubject(subjectId);
    Syllabus syllabus;
    if (file != null && !file.isEmpty()) {
      StoredFile storedFile = fileStorage.store(subjectId, file);
      syllabus = repository.saveSyllabus(subjectId, user.id(), storedFile.fileName(), storedFile.contentType(), storedFile.storagePath(), storedFile.extractedText(), "processing", null);
    } else if (textContent != null && !textContent.isBlank()) {
      syllabus = repository.saveSyllabus(subjectId, user.id(), "pasted-syllabus.txt", "text/plain", "inline", textContent, "processing", null);
    } else {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Syllabus file or text content is required");
    }
    // Fire LLM generation asynchronously — the request returns immediately
    contentGeneration.generateContentAsync(syllabus.id(), subjectId, repository.findSyllabusText(syllabus.id()).orElse(""));
    return syllabus;
  }

  @GetMapping("/subjects/{subjectId}/syllabi")
  public List<Syllabus> syllabi(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listSyllabi(subjectId);
  }

  @PostMapping("/subjects/{subjectId}/materials")
  public Material uploadMaterial(
      @AuthenticationPrincipal ApiUser user,
      @PathVariable UUID subjectId,
      @RequestParam MultipartFile file,
      @RequestParam(required = false) String title
  ) {
    requireSubjectAccess(user, subjectId);
    StoredFile storedFile = fileStorage.store(subjectId, file);
    return repository.saveMaterial(subjectId, user.id(), title == null || title.isBlank() ? storedFile.fileName() : title, storedFile.fileName(), storedFile.contentType(), storedFile.storagePath(), storedFile.extractedText());
  }

  @GetMapping("/subjects/{subjectId}/materials")
  public List<Material> materials(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listMaterials(subjectId);
  }

  @GetMapping("/subjects/{subjectId}/generated-content")
  public List<GeneratedContent> generatedContent(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listGeneratedContent(subjectId).stream()
        .filter(content -> isTeacher(user) || isAdmin(user) || "approved".equals(content.status()))
        .toList();
  }

  @PutMapping("/generated-content/{contentId}")
  public GeneratedContent updateGeneratedContent(@AuthenticationPrincipal ApiUser user, @PathVariable UUID contentId, @RequestBody UpdateGeneratedContentRequest request) {
    requireTeacher(user);
    return repository.updateGeneratedContent(contentId, request.status(), request.contentJson());
  }

  @PostMapping("/syllabi/{syllabusId}/regenerate")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public void regenerate(@AuthenticationPrincipal ApiUser user, @PathVariable UUID syllabusId) {
    requireTeacher(user);
    UUID subjectId = repository.findSyllabusSubjectId(syllabusId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Syllabus not found"));
    contentGeneration.generateContentAsync(syllabusId, subjectId, repository.findSyllabusText(syllabusId).orElse(""));
  }

  @GetMapping("/subjects/{subjectId}/questions")
  public List<Question> questions(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listQuestions(subjectId);
  }

  @PostMapping("/subjects/{subjectId}/questions")
  public Question createQuestion(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId, @Valid @RequestBody CreateTextRequest request) {
    requireSubjectAccess(user, subjectId);
    return repository.createQuestion(subjectId, user.id(), request.content());
  }

  @PostMapping("/questions/{questionId}/replies")
  public Reply reply(@AuthenticationPrincipal ApiUser user, @PathVariable UUID questionId, @Valid @RequestBody CreateTextRequest request) {
    UUID subjectId = repository.findQuestionSubjectId(questionId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    requireSubjectAccess(user, subjectId);
    return repository.addReply(questionId, user.id(), request.content());
  }

  @GetMapping("/subjects/{subjectId}/conversations")
  public List<Conversation> conversations(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listConversations(subjectId, user.id(), isTeacher(user) || isAdmin(user));
  }

  @PostMapping("/subjects/{subjectId}/conversations")
  public Conversation createConversation(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId, @Valid @RequestBody CreateConversationRequest request) {
    requireSubjectAccess(user, subjectId);
    String scope = request.scope() == null || request.scope().isBlank() ? "llm" : request.scope();
    if (!scope.equals("llm") && !scope.equals("subject")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject conversations must use scope subject or llm");
    }
    return repository.createConversation(subjectId, user.id(), request.title(), scope);
  }

  @PostMapping("/conversations/{conversationId}/messages")
  public Message addMessage(@AuthenticationPrincipal ApiUser user, @PathVariable UUID conversationId, @Valid @RequestBody CreateTextRequest request) {
    Conversation conversation = repository.getConversation(conversationId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
    if (!"peer_global".equals(conversation.scope())) {
      requireSubjectAccess(user, conversation.subjectId());
    }
    Message userMessage = repository.addMessage(conversationId, user.id(), "user", request.content());
    if ("llm".equals(conversation.scope())) {
      String answer = ollama.answerStudentQuestion(request.content(), repository.approvedContentContext(conversation.subjectId()));
      repository.addMessage(conversationId, null, "llm", answer);
    }
    return userMessage;
  }

  @GetMapping("/peer-threads")
  public List<Conversation> peerThreads() {
    return repository.listPeerThreads();
  }

  @PostMapping("/peer-threads")
  public Conversation createPeerThread(@AuthenticationPrincipal ApiUser user, @Valid @RequestBody CreateConversationRequest request) {
    if (!"student".equals(user.role())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can create peer threads");
    }
    Conversation conversation = repository.createConversation(null, user.id(), request.title(), "peer_global");
    if (request.scope() != null && !request.scope().isBlank()) {
      repository.addMessage(conversation.id(), user.id(), "user", request.scope());
    }
    return repository.getConversation(conversation.id()).orElse(conversation);
  }

  @PostMapping("/peer-threads/{threadId}/replies")
  public Message replyPeerThread(@AuthenticationPrincipal ApiUser user, @PathVariable UUID threadId, @Valid @RequestBody CreateTextRequest request) {
    Conversation conversation = repository.getConversation(threadId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Peer thread not found"));
    if (!"peer_global".equals(conversation.scope())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not a peer thread");
    }
    return repository.addMessage(threadId, user.id(), "user", request.content());
  }

  @PostMapping("/subjects/{subjectId}/understanding")
  public UnderstandingEntry submitUnderstanding(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId, @Valid @RequestBody UnderstandingRequest request) {
    requireSubjectAccess(user, subjectId);
    if (!List.of("lost", "basic", "okay", "confident", "mastered").contains(request.level())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid understanding level");
    }
    return repository.createUnderstanding(subjectId, user.id(), request.topic(), request.level(), request.note(), request.tags());
  }

  @GetMapping("/subjects/{subjectId}/understanding/me")
  public List<UnderstandingEntry> myUnderstanding(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireSubjectAccess(user, subjectId);
    return repository.listMyUnderstanding(subjectId, user.id());
  }

  @GetMapping("/subjects/{subjectId}/analytics/understanding")
  public UnderstandingAnalytics understandingAnalytics(@AuthenticationPrincipal ApiUser user, @PathVariable UUID subjectId) {
    requireTeacher(user);
    return repository.analytics(subjectId);
  }

  // Content generation is now handled asynchronously by ContentGenerationService

  private void ensureSubject(UUID subjectId) {
    repository.findSubject(subjectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
  }

  private void requireSubjectAccess(ApiUser user, UUID subjectId) {
    ensureSubject(subjectId);
    if (!repository.canAccessSubject(user, subjectId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this subject");
    }
  }

  private void requireTeacher(ApiUser user) {
    if (!isTeacher(user) && !isAdmin(user)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher or admin role required");
    }
  }

  private void requireAdmin(ApiUser user) {
    if (!isAdmin(user)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
    }
  }

  private boolean isTeacher(ApiUser user) {
    return "teacher".equals(user.role());
  }

  private boolean isAdmin(ApiUser user) {
    return "admin".equals(user.role());
  }
}
