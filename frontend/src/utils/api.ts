import type {
  AuthResponse,
  ClassGroup,
  Conversation,
  Course,
  EnrolledUser,
  GeneratedContent,
  Material,
  Question,
  Reply,
  Role,
  Syllabus,
  SyllabusTopic,
  UnderstandingAnalytics,
  UnderstandingEntry,
  User,
  UserSummary,
  AdminStats,
} from '../types';
import { config } from './config';

const TOKEN_KEY = 'symposium_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = tokenStore.get();
  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentLength = response.headers.get('Content-Length');
  if (contentLength === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

const toDate = (value: string | Date | undefined): Date => (value ? new Date(value) : new Date());

const mapQuestion = (question: Question): Question => ({
  ...question,
  courseId: question.courseId ?? question.subjectId,
  timestamp: toDate(question.createdAt ?? question.timestamp),
  replies: question.replies.map((reply) => ({
    ...reply,
    timestamp: toDate(reply.createdAt ?? reply.timestamp),
  })),
});

const mapConversation = (conversation: Conversation): Conversation => ({
  ...conversation,
  createdAt: toDate(conversation.createdAt),
  messages: conversation.messages.map((message) => ({
    ...message,
    createdAt: toDate(message.createdAt),
  })),
});

export const api = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(response.token);
    return response;
  },

  async register(name: string, email: string, password: string, role: Role = 'student'): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ name, email, password, role }),
    });
    tokenStore.set(response.token);
    return response;
  },

  me: () => request<User>('/me'),
  classes: () => request<ClassGroup[]>('/classes'),
  subjects: () => request<Course[]>('/subjects'),
  createSubject: (title: string, description: string, classId?: string | null) =>
    request<Course>('/subjects', {
      method: 'POST',
      body: JSON.stringify({ title, description, classId }),
    }),

  async uploadSyllabus(subjectId: string, payload: { file?: File | null; textContent?: string }) {
    const formData = new FormData();
    if (payload.file) formData.append('file', payload.file);
    if (payload.textContent) formData.append('textContent', payload.textContent);
    return request<Syllabus>(`/subjects/${subjectId}/syllabi`, {
      method: 'POST',
      body: formData,
    });
  },

  syllabi: (subjectId: string) => request<Syllabus[]>(`/subjects/${subjectId}/syllabi`),
  materials: (subjectId: string) => request<Material[]>(`/subjects/${subjectId}/materials`),
  generatedContent: (subjectId: string) => request<GeneratedContent[]>(`/subjects/${subjectId}/generated-content`),
  updateGeneratedContent: (contentId: string, status: string, contentJson?: string) =>
    request<GeneratedContent>(`/generated-content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, contentJson }),
    }),

  /** Improvement 1 & 2: fetch canonical topics extracted from approved content. */
  syllabusTopics: (subjectId: string) =>
    request<SyllabusTopic[]>(`/subjects/${subjectId}/syllabus-topics`),

  /** Improvement 2: teacher marks a topic covered. */
  coverTopic: (subjectId: string, topicId: string, coveredOn?: string) =>
    request<SyllabusTopic>(`/subjects/${subjectId}/syllabus-topics/${topicId}/cover`, {
      method: 'PATCH',
      body: JSON.stringify(coveredOn ? { coveredOn } : {}),
    }),

  /** Improvement 4: trigger LLM re-generation for a syllabus. */
  regenerateSyllabus: (subjectId: string, syllabusId: string) =>
    request<void>(`/subjects/${subjectId}/syllabi/${syllabusId}/regenerate`, { method: 'POST' }),

  async questions(subjectId: string): Promise<Question[]> {
    const questions = await request<Question[]>(`/subjects/${subjectId}/questions`);
    return questions.map(mapQuestion);
  },
  createQuestion: (subjectId: string, content: string) =>
    request<Question>(`/subjects/${subjectId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }).then(mapQuestion),
  addReply: (questionId: string, content: string) =>
    request<Reply>(`/questions/${questionId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  async conversations(subjectId: string): Promise<Conversation[]> {
    const conversations = await request<Conversation[]>(`/subjects/${subjectId}/conversations`);
    return conversations.map(mapConversation);
  },
  createConversation: (subjectId: string, title: string, scope: 'subject' | 'llm' = 'llm') =>
    request<Conversation>(`/subjects/${subjectId}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title, scope }),
    }).then(mapConversation),
  addMessage: (conversationId: string, content: string) =>
    request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  async peerThreads(): Promise<Conversation[]> {
    const conversations = await request<Conversation[]>('/peer-threads');
    return conversations.map(mapConversation);
  },
  createPeerThread: (title: string) =>
    request<Conversation>('/peer-threads', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }).then(mapConversation),
  replyPeerThread: (threadId: string, content: string) =>
    request(`/peer-threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  submitUnderstanding: (subjectId: string, payload: { topic: string; topicId?: string | null; level: string; note?: string; tags: string[] }) =>
    request<UnderstandingEntry>(`/subjects/${subjectId}/understanding`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  myUnderstanding: (subjectId: string) => request<UnderstandingEntry[]>(`/subjects/${subjectId}/understanding/me`),
  understandingAnalytics: (subjectId: string) =>
    request<UnderstandingAnalytics>(`/subjects/${subjectId}/analytics/understanding`),

  users: (search?: string) =>
    request<UserSummary[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  enrollments: (subjectId: string) => request<EnrolledUser[]>(`/subjects/${subjectId}/enrollments`),
  enroll: (subjectId: string, userId: string, role: string) =>
    request<void>(`/subjects/${subjectId}/enrollments`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),
  unenroll: (subjectId: string, userId: string) =>
    request<void>(`/subjects/${subjectId}/enrollments/${userId}`, { method: 'DELETE' }),
  deleteSubject: (subjectId: string) =>
    request<void>(`/subjects/${subjectId}`, { method: 'DELETE' }),

  updateUserRole: (userId: string, role: string) =>
    request<void>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (userId: string) =>
    request<void>(`/admin/users/${userId}`, { method: 'DELETE' }),
  adminStats: () => request<AdminStats>('/admin/stats'),
};
