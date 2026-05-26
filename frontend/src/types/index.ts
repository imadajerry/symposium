// User & Role Types
export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  avatar: string;
  createdAt?: Date | string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

export interface AdminStats {
  totalUsers: number;
  totalClasses: number;
  totalSubjects: number;
  totalQuestions: number;
  totalUnderstandingEntries: number;
}

export interface EnrolledUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  enrollmentRole: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date | string;
}

// Subject/Course Types
export interface Course {
  id: string;
  classId?: string | null;
  title: string;
  description: string;
  materialUrl?: string;
  materialType?: 'pdf' | 'image' | 'text';
  textContent?: string;
  createdAt?: Date | string;
  createdBy?: string;
}

export interface CreateCourseInput {
  title: string;
  description: string;
  textContent?: string;
  file?: File | null;
}

export interface Syllabus {
  id: string;
  subjectId: string;
  fileName: string;
  contentType: string;
  status: string;
  errorMessage?: string;
  createdAt: Date | string;
}

export interface Material {
  id: string;
  subjectId: string;
  title: string;
  fileName: string;
  contentType: string;
  createdAt: Date | string;
}

export interface GeneratedContent {
  id: string;
  subjectId: string;
  syllabusId?: string;
  status: 'processing' | 'ready_for_review' | 'approved' | 'failed';
  contentJson: string;
  errorMessage?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Question & Reply Types
export interface Reply {
  id: string;
  questionId?: string;
  userId?: string;
  authorName: string;
  authorRole?: Role;
  role?: Role;
  content: string;
  timestamp: Date;
  createdAt?: Date | string;
}

export interface Question {
  id: string;
  courseId?: string;
  subjectId: string;
  userId: string;
  authorName: string;
  authorRole?: Role;
  content: string;
  timestamp: Date;
  createdAt?: Date | string;
  upvotes: number;
  isAnswered: boolean;
  replies: Reply[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string;
  senderName?: string;
  senderType: 'user' | 'llm' | 'system';
  content: string;
  createdAt: Date | string;
}

export interface Conversation {
  id: string;
  subjectId?: string | null;
  ownerId: string;
  ownerName: string;
  title: string;
  scope: 'subject' | 'llm' | 'peer_global';
  createdAt: Date | string;
  messages: Message[];
}

export type UnderstandingLevel = 'lost' | 'basic' | 'okay' | 'confident' | 'mastered';

export interface UnderstandingEntry {
  id: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  topic: string;
  level: UnderstandingLevel;
  note?: string;
  tags: string[];
  createdAt: Date | string;
}

export interface UnderstandingAnalytics {
  averageScore: number;
  totalEntries: number;
  topics: Array<{ topic: string; averageScore: number; totalEntries: number }>;
  tags: Array<{ tag: string; count: number }>;
  recentLowEntries: UnderstandingEntry[];
}

// Context Types
export interface DataContextType {
  currentUser: User;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  courses: Course[];
  addCourse: (course: CreateCourseInput) => Promise<Course>;
  removeCourse: (courseId: string) => Promise<void>;
  questions: Question[];
  addQuestion: (courseId: string, content: string) => Promise<void>;
  addReply: (questionId: string, content: string) => Promise<void>;
  generatedContent: GeneratedContent[];
  approveGeneratedContent: (contentId: string) => Promise<void>;
  syllabi: Syllabus[];
  materials: Material[];
  conversations: Conversation[];
  startLlmConversation: (title: string) => Promise<Conversation>;
  sendConversationMessage: (conversationId: string, content: string) => Promise<void>;
  peerThreads: Conversation[];
  addPeerThread: (title: string) => Promise<void>;
  addPeerReply: (threadId: string, content: string) => Promise<void>;
  understandingEntries: UnderstandingEntry[];
  understandingAnalytics: UnderstandingAnalytics | null;
  submitUnderstanding: (payload: { topic: string; level: UnderstandingLevel; note?: string; tags: string[] }) => Promise<void>;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
}
