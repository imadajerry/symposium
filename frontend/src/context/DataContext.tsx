import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Conversation,
  Course,
  CreateCourseInput,
  DataContextType,
  GeneratedContent,
  Material,
  Question,
  Syllabus,
  UnderstandingAnalytics,
  UnderstandingEntry,
  UnderstandingLevel,
} from '../types';
import { api } from '../utils/api';
import { logger } from '../utils/config';
import { useAuth } from './AuthContext';

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [peerThreads, setPeerThreads] = useState<Conversation[]>([]);
  const [understandingEntries, setUnderstandingEntries] = useState<UnderstandingEntry[]>([]);
  const [understandingAnalytics, setUnderstandingAnalytics] = useState<UnderstandingAnalytics | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    const subjects = await api.subjects();
    setCourses(subjects);
    setActiveCourseId((current) => current ?? subjects[0]?.id ?? null);
  };

  const loadActiveCourseData = async (subjectId: string) => {
    const [nextQuestions, nextSyllabi, nextMaterials, nextGeneratedContent, nextConversations, nextUnderstanding] =
      await Promise.all([
        api.questions(subjectId),
        api.syllabi(subjectId),
        api.materials(subjectId),
        api.generatedContent(subjectId),
        api.conversations(subjectId),
        api.myUnderstanding(subjectId),
      ]);

    setQuestions(nextQuestions);
    setSyllabi(nextSyllabi);
    setMaterials(nextMaterials);
    setGeneratedContent(nextGeneratedContent);
    setConversations(nextConversations);
    setUnderstandingEntries(nextUnderstanding);

    if (user?.role === 'teacher' || user?.role === 'admin') {
      setUnderstandingAnalytics(await api.understandingAnalytics(subjectId));
    } else {
      setUnderstandingAnalytics(null);
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadSubjects();
      setPeerThreads(await api.peerThreads());
    } catch (refreshError) {
      logger.error('Failed to load portal data', refreshError);
      setError('Unable to load backend data. Confirm the Java API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeCourseId) return;
    loadActiveCourseData(activeCourseId)
      .then(() => {
        // If syllabi are still processing, start polling
        setSyllabi((current) => {
          if (current.some((s) => s.status === 'processing')) {
            startProcessingPoll(activeCourseId);
          }
          return current;
        });
      })
      .catch((loadError) => {
        logger.error('Failed to load subject data', loadError);
        setError('Unable to load selected subject data.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourseId]);

  const addCourse = async (course: CreateCourseInput): Promise<Course> => {
    const subject = await api.createSubject(course.title, course.description);
    if (course.file || course.textContent?.trim()) {
      await api.uploadSyllabus(subject.id, {
        file: course.file,
        textContent: course.textContent,
      });
    }
    await loadSubjects();
    setActiveCourseId(subject.id);
    // Start polling for processing completion
    startProcessingPoll(subject.id);
    return subject;
  };

  const startProcessingPoll = (subjectId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const latestSyllabi = await api.syllabi(subjectId);
        setSyllabi(latestSyllabi);
        const stillProcessing = latestSyllabi.some((s: Syllabus) => s.status === 'processing');
        if (!stillProcessing) {
          clearInterval(pollInterval);
          // Refresh generated content now that processing is done
          setGeneratedContent(await api.generatedContent(subjectId));
        }
      } catch {
        clearInterval(pollInterval);
      }
    }, 5000);
  };

  const removeCourse = async (courseId: string) => {
    await api.deleteSubject(courseId);
    setActiveCourseId((current) => (current === courseId ? null : current));
    await loadSubjects();
  };

  const addQuestion = async (courseId: string, content: string) => {
    await api.createQuestion(courseId, content);
    setQuestions(await api.questions(courseId));
  };

  const addReply = async (questionId: string, content: string) => {
    await api.addReply(questionId, content);
    if (activeCourseId) setQuestions(await api.questions(activeCourseId));
  };

  const approveGeneratedContent = async (contentId: string) => {
    await api.updateGeneratedContent(contentId, 'approved');
    if (activeCourseId) setGeneratedContent(await api.generatedContent(activeCourseId));
  };

  const startLlmConversation = async (title: string): Promise<Conversation> => {
    if (!activeCourseId) throw new Error('Select a subject first');
    const conversation = await api.createConversation(activeCourseId, title, 'llm');
    setConversations(await api.conversations(activeCourseId));
    return conversation;
  };

  const sendConversationMessage = async (conversationId: string, content: string) => {
    await api.addMessage(conversationId, content);
    if (activeCourseId) setConversations(await api.conversations(activeCourseId));
  };

  const addPeerThread = async (title: string) => {
    await api.createPeerThread(title);
    setPeerThreads(await api.peerThreads());
  };

  const addPeerReply = async (threadId: string, content: string) => {
    await api.replyPeerThread(threadId, content);
    setPeerThreads(await api.peerThreads());
  };

  const submitUnderstanding = async (payload: {
    topic: string;
    level: UnderstandingLevel;
    note?: string;
    tags: string[];
  }) => {
    if (!activeCourseId) return;
    await api.submitUnderstanding(activeCourseId, payload);
    setUnderstandingEntries(await api.myUnderstanding(activeCourseId));
  };

  if (!user) {
    throw new Error('DataProvider requires an authenticated user');
  }

  const value: DataContextType = {
    currentUser: user,
    isLoading,
    error,
    refresh,
    courses,
    addCourse,
    removeCourse,
    questions,
    addQuestion,
    addReply,
    generatedContent,
    approveGeneratedContent,
    syllabi,
    materials,
    conversations,
    startLlmConversation,
    sendConversationMessage,
    peerThreads,
    addPeerThread,
    addPeerReply,
    understandingEntries,
    understandingAnalytics,
    submitUnderstanding,
    activeCourseId,
    setActiveCourseId,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
