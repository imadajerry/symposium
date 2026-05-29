package com.quickquery.portal.data;

import com.quickquery.portal.model.ApiDtos.*;
import com.quickquery.portal.model.ApiUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Repository;

@Repository
public class PortalRepository {
  private final JdbcTemplate jdbc;

  public PortalRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record UserWithPassword(ApiUser user, String passwordHash) {}

  public void seedDemoData(PasswordEncoder encoder) {
    Integer count = jdbc.queryForObject("select count(*) from app_users", Integer.class);
    if (count != null && count > 0) return;

    ApiUser admin = createUser("Admin User", "admin@quickquery.com", encoder.encode("admin123"), "admin", "A");
    ApiUser teacher = createUser("Prof. Sarah Johnson", "sarah@quickquery.com", encoder.encode("teacher123"), "teacher", "T");
    ApiUser student = createUser("Alex Thompson", "alex@student.com", encoder.encode("student123"), "student", "S");
    createUser("Emma Wilson", "emma@student.com", encoder.encode("student123"), "student", "S");

    ClassGroup classGroup = createClass("First Year Science", "Demo class for onboarding", teacher.id());
    Subject physics = createSubject(classGroup.id(), "Introduction to Physics", "Mechanics and Motion", teacher.id());
    Subject calculus = createSubject(classGroup.id(), "Calculus I", "Derivatives and Integrals", teacher.id());
    enroll(physics.id(), teacher.id(), "teacher");
    enroll(physics.id(), student.id(), "student");
    enroll(calculus.id(), teacher.id(), "teacher");
    enroll(calculus.id(), student.id(), "student");
    createQuestion(physics.id(), student.id(), "Can you explain the difference between velocity and acceleration?");
  }

  public ApiUser createUser(String name, String email, String passwordHash, String role, String avatar) {
    return jdbc.queryForObject("""
        insert into app_users (name, email, password_hash, role, avatar)
        values (?, ?, ?, ?, ?)
        returning id, name, email, role, avatar, created_at
        """, this::mapUser, name, email.toLowerCase(), passwordHash, role, avatar);
  }

  public List<UserSummary> listUsers(String search) {
    String pattern = search == null || search.isBlank() ? "%" : "%" + search.toLowerCase() + "%";
    return jdbc.query("""
        select id, name, email, role, avatar from app_users
        where lower(name) like ? or lower(email) like ?
        order by name asc limit 50
        """, (rs, rowNum) -> new UserSummary(
            rs.getObject("id", UUID.class),
            rs.getString("name"),
            rs.getString("email"),
            rs.getString("role"),
            rs.getString("avatar")
        ), pattern, pattern);
  }

  public void updateUserRole(UUID userId, String role) {
    jdbc.update("update app_users set role = ?, updated_at = now() where id = ?", role, userId);
  }

  public void deleteUser(UUID userId) {
    jdbc.update("delete from app_users where id = ?", userId);
  }

  public AdminStats getAdminStats() {
    Integer users = jdbc.queryForObject("select count(*) from app_users", Integer.class);
    Integer classes = jdbc.queryForObject("select count(*) from class_groups", Integer.class);
    Integer subjects = jdbc.queryForObject("select count(*) from subjects", Integer.class);
    Integer questions = jdbc.queryForObject("select count(*) from questions", Integer.class);
    Integer understanding = jdbc.queryForObject("select count(*) from understanding_entries", Integer.class);
    return new AdminStats(users == null ? 0 : users, classes == null ? 0 : classes, subjects == null ? 0 : subjects, questions == null ? 0 : questions, understanding == null ? 0 : understanding);
  }

  public List<EnrolledUser> listEnrolledUsers(UUID subjectId) {
    return jdbc.query("""
        select u.id, u.name, u.email, u.role, u.avatar, e.role as enrollment_role
        from enrollments e join app_users u on u.id = e.user_id
        where e.subject_id = ?
        order by u.name asc
        """, (rs, rowNum) -> new EnrolledUser(
            rs.getObject("id", UUID.class),
            rs.getString("name"),
            rs.getString("email"),
            rs.getString("role"),
            rs.getString("avatar"),
            rs.getString("enrollment_role")
        ), subjectId);
  }

  public void unenroll(UUID subjectId, UUID userId) {
    jdbc.update("delete from enrollments where subject_id = ? and user_id = ?", subjectId, userId);
  }

  public void deleteSubject(UUID subjectId) {
    // Cascade manually in dependency order
    jdbc.update("delete from understanding_entry_tags where understanding_id in (select id from understanding_entries where subject_id = ?)", subjectId);
    jdbc.update("delete from understanding_entries where subject_id = ?", subjectId);
    jdbc.update("delete from messages where conversation_id in (select id from conversations where subject_id = ?)", subjectId);
    jdbc.update("delete from conversations where subject_id = ?", subjectId);
    jdbc.update("delete from replies where question_id in (select id from questions where subject_id = ?)", subjectId);
    jdbc.update("delete from questions where subject_id = ?", subjectId);
    jdbc.update("delete from generated_content where subject_id = ?", subjectId);
    jdbc.update("delete from course_materials where subject_id = ?", subjectId);
    jdbc.update("delete from syllabi where subject_id = ?", subjectId);
    jdbc.update("delete from enrollments where subject_id = ?", subjectId);
    jdbc.update("delete from subjects where id = ?", subjectId);
  }

  public Optional<UserWithPassword> findUserWithPasswordByEmail(String email) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("""
          select id, name, email, role, avatar, created_at, password_hash
          from app_users where lower(email) = lower(?)
          """, (rs, rowNum) -> new UserWithPassword(mapUser(rs), rs.getString("password_hash")), email));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public Optional<ApiUser> findUserById(UUID id) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("""
          select id, name, email, role, avatar, created_at from app_users where id = ?
          """, this::mapUser, id));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public List<ClassGroup> listClasses(ApiUser user) {
    if (isAdmin(user)) {
      return jdbc.query("select * from class_groups order by created_at desc", this::mapClassGroup);
    }
    return jdbc.query("""
        select distinct cg.* from class_groups cg
        join subjects s on s.class_id = cg.id
        join enrollments e on e.subject_id = s.id
        where e.user_id = ?
        order by cg.created_at desc
        """, this::mapClassGroup, user.id());
  }

  public ClassGroup createClass(String name, String description, UUID createdBy) {
    return jdbc.queryForObject("""
        insert into class_groups (name, description, created_by)
        values (?, ?, ?)
        returning *
        """, this::mapClassGroup, name, description, createdBy);
  }

  public List<Subject> listSubjects(ApiUser user) {
    if (isAdmin(user) || isTeacher(user)) {
      return jdbc.query("select * from subjects order by created_at desc", this::mapSubject);
    }
    return jdbc.query("""
        select s.* from subjects s
        join enrollments e on e.subject_id = s.id
        where e.user_id = ?
        order by s.created_at desc
        """, this::mapSubject, user.id());
  }

  public Optional<Subject> findSubject(UUID subjectId) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select * from subjects where id = ?", this::mapSubject, subjectId));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public Subject createSubject(UUID classId, String title, String description, UUID createdBy) {
    return jdbc.queryForObject("""
        insert into subjects (class_id, title, description, created_by)
        values (?, ?, ?, ?)
        returning *
        """, this::mapSubject, classId, title, description, createdBy);
  }

  public void enroll(UUID subjectId, UUID userId, String role) {
    jdbc.update("""
        insert into enrollments (subject_id, user_id, role)
        values (?, ?, ?)
        on conflict (subject_id, user_id) do update set role = excluded.role
        """, subjectId, userId, role == null ? "student" : role);
  }

  public boolean canAccessSubject(ApiUser user, UUID subjectId) {
    if (isAdmin(user) || isTeacher(user)) return true;
    Integer count = jdbc.queryForObject("""
        select count(*) from enrollments where subject_id = ? and user_id = ?
        """, Integer.class, subjectId, user.id());
    return count != null && count > 0;
  }

  public Syllabus saveSyllabus(UUID subjectId, UUID uploadedBy, String fileName, String contentType, String storagePath, String extractedText, String status, String errorMessage) {
    return jdbc.queryForObject("""
        insert into syllabi (subject_id, uploaded_by, file_name, content_type, storage_path, extracted_text, status, error_message)
        values (?, ?, ?, ?, ?, ?, ?, ?)
        returning id, subject_id, file_name, content_type, status, error_message, created_at, length(coalesce(extracted_text, '')) as char_count
        """, this::mapSyllabus, subjectId, uploadedBy, fileName, contentType, storagePath, extractedText, status, errorMessage);
  }

  public List<Syllabus> listSyllabi(UUID subjectId) {
    return jdbc.query("""
        select id, subject_id, file_name, content_type, status, error_message, created_at, length(coalesce(extracted_text, '')) as char_count
        from syllabi where subject_id = ? order by created_at desc
        """, this::mapSyllabus, subjectId);
  }

  public Optional<String> findSyllabusText(UUID syllabusId) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select extracted_text from syllabi where id = ?", String.class, syllabusId));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public Optional<UUID> findSyllabusSubjectId(UUID syllabusId) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select subject_id from syllabi where id = ?", UUID.class, syllabusId));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public void updateSyllabusStatus(UUID syllabusId, String status, String errorMessage) {
    jdbc.update("update syllabi set status = ?, error_message = ?, updated_at = now() where id = ?", status, errorMessage, syllabusId);
  }

  /** Reset any syllabi stuck in 'processing' from a previous server run. */
  public int resetStaleSyllabi() {
    return jdbc.update("update syllabi set status = 'uploaded', error_message = 'Reset: server restarted during processing', updated_at = now() where status = 'processing'");
  }

  public Material saveMaterial(UUID subjectId, UUID uploadedBy, String title, String fileName, String contentType, String storagePath, String extractedText) {
    return jdbc.queryForObject("""
        insert into course_materials (subject_id, uploaded_by, title, file_name, content_type, storage_path, extracted_text)
        values (?, ?, ?, ?, ?, ?, ?)
        returning id, subject_id, title, file_name, content_type, created_at
        """, this::mapMaterial, subjectId, uploadedBy, title, fileName, contentType, storagePath, extractedText);
  }

  public List<Material> listMaterials(UUID subjectId) {
    return jdbc.query("""
        select id, subject_id, title, file_name, content_type, created_at
        from course_materials where subject_id = ? order by created_at desc
        """, this::mapMaterial, subjectId);
  }

  public GeneratedContent saveGeneratedContent(UUID subjectId, UUID syllabusId, String status, String contentJson, String errorMessage) {
    return jdbc.queryForObject("""
        insert into generated_content (subject_id, syllabus_id, status, content_json, error_message)
        values (?, ?, ?, cast(? as jsonb), ?)
        returning id, subject_id, syllabus_id, status, content_json::text as content_json, error_message, created_at, updated_at
        """, this::mapGeneratedContent, subjectId, syllabusId, status, contentJson, errorMessage);
  }

  public List<GeneratedContent> listGeneratedContent(UUID subjectId) {
    return jdbc.query("""
        select id, subject_id, syllabus_id, status, content_json::text as content_json, error_message, created_at, updated_at
        from generated_content where subject_id = ? order by created_at desc
        """, this::mapGeneratedContent, subjectId);
  }

  public GeneratedContent updateGeneratedContent(UUID contentId, String status, String contentJson) {
    if (contentJson == null) {
      return jdbc.queryForObject("""
          update generated_content
          set status = coalesce(?, status),
              updated_at = now()
          where id = ?
          returning id, subject_id, syllabus_id, status, content_json::text as content_json, error_message, created_at, updated_at
          """, this::mapGeneratedContent, status, contentId);
    } else {
      return jdbc.queryForObject("""
          update generated_content
          set status = coalesce(?, status),
              content_json = cast(? as jsonb),
              updated_at = now()
          where id = ?
          returning id, subject_id, syllabus_id, status, content_json::text as content_json, error_message, created_at, updated_at
          """, this::mapGeneratedContent, status, contentJson, contentId);
    }
  }

  public String approvedContentContext(UUID subjectId) {
    List<String> items = jdbc.query("""
        select content_json::text from generated_content
        where subject_id = ? and status = 'approved'
        order by updated_at desc limit 3
        """, (rs, rowNum) -> rs.getString(1), subjectId);
    return String.join("\n", items);
  }

  public Question createQuestion(UUID subjectId, UUID userId, String content) {
    UUID id = jdbc.queryForObject("""
        insert into questions (subject_id, user_id, content)
        values (?, ?, ?)
        returning id
        """, UUID.class, subjectId, userId, content);
    return listQuestions(subjectId).stream().filter(q -> q.id().equals(id)).findFirst().orElseThrow();
  }

  public List<Question> listQuestions(UUID subjectId) {
    List<Question> questions = jdbc.query("""
        select q.id, q.subject_id, q.user_id, u.name as author_name, u.role as author_role,
               q.content, q.upvotes, q.is_answered, q.created_at
        from questions q join app_users u on u.id = q.user_id
        where q.subject_id = ?
        order by q.created_at desc
        """, (rs, rowNum) -> new Question(
            rs.getObject("id", UUID.class),
            rs.getObject("subject_id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("author_name"),
            rs.getString("author_role"),
            rs.getString("content"),
            rs.getInt("upvotes"),
            rs.getBoolean("is_answered"),
            instant(rs, "created_at"),
            new ArrayList<>()
        ), subjectId);
    for (Question question : questions) {
      question.replies().addAll(listReplies(question.id()));
    }
    return questions;
  }

  public Reply addReply(UUID questionId, UUID userId, String content) {
    UUID id = jdbc.queryForObject("""
        insert into replies (question_id, user_id, content)
        values (?, ?, ?)
        returning id
        """, UUID.class, questionId, userId, content);
    jdbc.update("update questions set is_answered = true where id = ?", questionId);
    return listReplies(questionId).stream().filter(reply -> reply.id().equals(id)).findFirst().orElseThrow();
  }

  public Optional<UUID> findQuestionSubjectId(UUID questionId) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select subject_id from questions where id = ?", UUID.class, questionId));
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public Conversation createConversation(UUID subjectId, UUID ownerId, String title, String scope) {
    UUID id = jdbc.queryForObject("""
        insert into conversations (subject_id, owner_id, title, scope)
        values (?, ?, ?, ?)
        returning id
        """, UUID.class, subjectId, ownerId, title, scope);
    return getConversation(id).orElseThrow();
  }

  public Optional<Conversation> getConversation(UUID conversationId) {
    try {
      Conversation conversation = jdbc.queryForObject("""
          select c.*, u.name as owner_name from conversations c
          join app_users u on u.id = c.owner_id
          where c.id = ?
          """, this::mapConversation, conversationId);
      conversation.messages().addAll(listMessages(conversationId));
      return Optional.of(conversation);
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  public List<Conversation> listConversations(UUID subjectId, UUID userId, boolean teacherOrAdmin) {
    List<Conversation> conversations = jdbc.query("""
        select c.*, u.name as owner_name from conversations c
        join app_users u on u.id = c.owner_id
        where c.subject_id = ? and (c.owner_id = ? or ?)
        order by c.updated_at desc
        """, this::mapConversation, subjectId, userId, teacherOrAdmin);
    conversations.forEach(c -> c.messages().addAll(listMessages(c.id())));
    return conversations;
  }

  public List<Conversation> listPeerThreads() {
    List<Conversation> conversations = jdbc.query("""
        select c.*, u.name as owner_name from conversations c
        join app_users u on u.id = c.owner_id
        where c.scope = 'peer_global'
        order by c.updated_at desc
        limit 50
        """, this::mapConversation);
    conversations.forEach(c -> c.messages().addAll(listMessages(c.id())));
    return conversations;
  }

  public Message addMessage(UUID conversationId, UUID senderId, String senderType, String content) {
    UUID id = jdbc.queryForObject("""
        insert into messages (conversation_id, sender_id, sender_type, content)
        values (?, ?, ?, ?)
        returning id
        """, UUID.class, conversationId, senderId, senderType, content);
    jdbc.update("update conversations set updated_at = now() where id = ?", conversationId);
    return listMessages(conversationId).stream().filter(message -> message.id().equals(id)).findFirst().orElseThrow();
  }

  public UnderstandingEntry createUnderstanding(UUID subjectId, UUID studentId, String topic, String level, String note, List<String> tags) {
    UUID id = jdbc.queryForObject("""
        insert into understanding_entries (subject_id, student_id, topic, level, note)
        values (?, ?, ?, ?, ?)
        returning id
        """, UUID.class, subjectId, studentId, topic, level, note);
    if (tags != null) {
      for (String tag : tags.stream().map(String::trim).filter(t -> !t.isBlank()).distinct().toList()) {
        UUID tagId = jdbc.queryForObject("""
            insert into tags (name) values (lower(?))
            on conflict (name) do update set name = excluded.name
            returning id
            """, UUID.class, tag);
        jdbc.update("insert into understanding_entry_tags (understanding_id, tag_id) values (?, ?) on conflict do nothing", id, tagId);
      }
    }
    return getUnderstanding(id).orElseThrow();
  }

  public List<UnderstandingEntry> listMyUnderstanding(UUID subjectId, UUID studentId) {
    List<UnderstandingEntry> entries = jdbc.query("""
        select ue.*, u.name as student_name from understanding_entries ue
        join app_users u on u.id = ue.student_id
        where ue.subject_id = ? and ue.student_id = ?
        order by ue.created_at desc
        """, this::mapUnderstanding, subjectId, studentId);
    entries.forEach(e -> e.tags().addAll(tagsForUnderstanding(e.id())));
    return entries;
  }

  public UnderstandingAnalytics analytics(UUID subjectId) {
    List<TopicUnderstanding> topics = jdbc.query("""
        select topic, avg(case level
          when 'lost' then 1 when 'basic' then 2 when 'okay' then 3 when 'confident' then 4 when 'mastered' then 5 end) as avg_score,
          count(*) as total_entries
        from understanding_entries where subject_id = ?
        group by topic order by avg_score asc, total_entries desc
        """, (rs, rowNum) -> new TopicUnderstanding(rs.getString("topic"), rs.getDouble("avg_score"), rs.getInt("total_entries")), subjectId);
    List<TagCount> tags = jdbc.query("""
        select t.name, count(*) as total from tags t
        join understanding_entry_tags uet on uet.tag_id = t.id
        join understanding_entries ue on ue.id = uet.understanding_id
        where ue.subject_id = ?
        group by t.name order by total desc limit 20
        """, (rs, rowNum) -> new TagCount(rs.getString("name"), rs.getInt("total")), subjectId);
    List<UnderstandingEntry> recentLow = jdbc.query("""
        select ue.*, u.name as student_name from understanding_entries ue
        join app_users u on u.id = ue.student_id
        where ue.subject_id = ? and ue.level in ('lost', 'basic')
        order by ue.created_at desc limit 10
        """, this::mapUnderstanding, subjectId);
    recentLow.forEach(e -> e.tags().addAll(tagsForUnderstanding(e.id())));
    int total = topics.stream().mapToInt(TopicUnderstanding::totalEntries).sum();
    double avg = topics.stream().mapToDouble(t -> t.averageScore() * t.totalEntries()).sum() / Math.max(1, total);
    return new UnderstandingAnalytics(avg, total, topics, tags, recentLow);
  }

  private Optional<UnderstandingEntry> getUnderstanding(UUID id) {
    try {
      UnderstandingEntry entry = jdbc.queryForObject("""
          select ue.*, u.name as student_name from understanding_entries ue
          join app_users u on u.id = ue.student_id
          where ue.id = ?
          """, this::mapUnderstanding, id);
      entry.tags().addAll(tagsForUnderstanding(id));
      return Optional.of(entry);
    } catch (EmptyResultDataAccessException e) {
      return Optional.empty();
    }
  }

  private List<Reply> listReplies(UUID questionId) {
    return jdbc.query("""
        select r.id, r.question_id, r.user_id, u.name as author_name, u.role as author_role,
               r.content, r.created_at
        from replies r join app_users u on u.id = r.user_id
        where r.question_id = ?
        order by r.created_at asc
        """, (rs, rowNum) -> new Reply(
            rs.getObject("id", UUID.class),
            rs.getObject("question_id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getString("author_name"),
            rs.getString("author_role"),
            rs.getString("content"),
            instant(rs, "created_at")
        ), questionId);
  }

  private List<Message> listMessages(UUID conversationId) {
    return jdbc.query("""
        select m.id, m.conversation_id, m.sender_id, u.name as sender_name, m.sender_type, m.content, m.created_at
        from messages m left join app_users u on u.id = m.sender_id
        where m.conversation_id = ?
        order by m.created_at asc
        """, (rs, rowNum) -> new Message(
            rs.getObject("id", UUID.class),
            rs.getObject("conversation_id", UUID.class),
            rs.getObject("sender_id", UUID.class),
            rs.getString("sender_name"),
            rs.getString("sender_type"),
            rs.getString("content"),
            instant(rs, "created_at")
        ), conversationId);
  }

  private List<String> tagsForUnderstanding(UUID understandingId) {
    return jdbc.query("""
        select t.name from tags t
        join understanding_entry_tags uet on uet.tag_id = t.id
        where uet.understanding_id = ?
        order by t.name
        """, (rs, rowNum) -> rs.getString("name"), understandingId);
  }

  private ApiUser mapUser(ResultSet rs) throws SQLException {
    return new ApiUser(
        rs.getObject("id", UUID.class),
        rs.getString("name"),
        rs.getString("email"),
        rs.getString("role"),
        rs.getString("avatar"),
        instant(rs, "created_at")
    );
  }

  private ApiUser mapUser(ResultSet rs, int rowNum) throws SQLException {
    return mapUser(rs);
  }

  private ClassGroup mapClassGroup(ResultSet rs, int rowNum) throws SQLException {
    return new ClassGroup(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("description"), rs.getObject("created_by", UUID.class), instant(rs, "created_at"));
  }

  private Subject mapSubject(ResultSet rs, int rowNum) throws SQLException {
    return new Subject(rs.getObject("id", UUID.class), rs.getObject("class_id", UUID.class), rs.getString("title"), rs.getString("description"), rs.getObject("created_by", UUID.class), instant(rs, "created_at"));
  }

  private Syllabus mapSyllabus(ResultSet rs, int rowNum) throws SQLException {
    int charCount = rs.getInt("char_count");
    boolean isTruncated = charCount > 12000;
    return new Syllabus(
        rs.getObject("id", UUID.class),
        rs.getObject("subject_id", UUID.class),
        rs.getString("file_name"),
        rs.getString("content_type"),
        rs.getString("status"),
        rs.getString("error_message"),
        instant(rs, "created_at"),
        charCount,
        isTruncated
    );
  }

  private Material mapMaterial(ResultSet rs, int rowNum) throws SQLException {
    return new Material(rs.getObject("id", UUID.class), rs.getObject("subject_id", UUID.class), rs.getString("title"), rs.getString("file_name"), rs.getString("content_type"), instant(rs, "created_at"));
  }

  private GeneratedContent mapGeneratedContent(ResultSet rs, int rowNum) throws SQLException {
    return new GeneratedContent(rs.getObject("id", UUID.class), rs.getObject("subject_id", UUID.class), rs.getObject("syllabus_id", UUID.class), rs.getString("status"), rs.getString("content_json"), rs.getString("error_message"), instant(rs, "created_at"), instant(rs, "updated_at"));
  }

  private Conversation mapConversation(ResultSet rs, int rowNum) throws SQLException {
    return new Conversation(rs.getObject("id", UUID.class), rs.getObject("subject_id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("owner_name"), rs.getString("title"), rs.getString("scope"), instant(rs, "created_at"), new ArrayList<>());
  }

  private UnderstandingEntry mapUnderstanding(ResultSet rs, int rowNum) throws SQLException {
    return new UnderstandingEntry(rs.getObject("id", UUID.class), rs.getObject("subject_id", UUID.class), rs.getObject("student_id", UUID.class), rs.getString("student_name"), rs.getString("topic"), rs.getString("level"), rs.getString("note"), new ArrayList<>(), instant(rs, "created_at"));
  }

  private static java.time.Instant instant(ResultSet rs, String column) throws SQLException {
    return rs.getObject(column, OffsetDateTime.class).toInstant();
  }

  private static boolean isAdmin(ApiUser user) {
    return "admin".equals(user.role());
  }

  private static boolean isTeacher(ApiUser user) {
    return "teacher".equals(user.role());
  }
}
