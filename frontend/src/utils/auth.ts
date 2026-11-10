import type { User, Role } from '../types';
import { logger } from './config';

// Simple hash functiqon for password (NOT for production - use bcrypt in real apps)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Local user storage key
const USERS_STORAGE_KEY = 'symposium_users';
const SESSION_STORAGE_KEY = 'symposium_session';

export interface StoredUser extends User {
  email: string;
  passwordHash: string;
}

// Default users for development/testing
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@symposium.edu',
    role: 'admin',
    avatar: '⚙️',
    passwordHash: simpleHash('admin123'),
  },
  {
    id: 'teacher-1',
    name: 'Prof. Sarah Johnson',
    email: 'sarah@symposium.edu',
    role: 'teacher',
    avatar: '👩‍🏫',
    passwordHash: simpleHash('teacher123'),
  },
  {
    id: 'teacher-2',
    name: 'Dr. Michael Chen',
    email: 'michael@symposium.edu',
    role: 'teacher',
    avatar: '👨‍🏫',
    passwordHash: simpleHash('teacher123'),
  },
  {
    id: 'student-1',
    name: 'Alex Thompson',
    email: 'alex@student.com',
    role: 'student',
    avatar: '🎓',
    passwordHash: simpleHash('student123'),
  },
  {
    id: 'student-2',
    name: 'Emma Wilson',
    email: 'emma@student.com',
    role: 'student',
    avatar: '👩‍🎓',
    passwordHash: simpleHash('student123'),
  },
];

// Initialize users in localStorage if not present
const initializeUsers = (): void => {
  const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    logger.log('Initialized default users');
  }
};

// Get all users
export const getUsers = (): StoredUser[] => {
  initializeUsers();
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : [];
};

// Get user by email
export const getUserByEmail = (email: string): StoredUser | undefined => {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

// Authenticate user
export const authenticateUser = (email: string, password: string): StoredUser | null => {
  const user = getUserByEmail(email);
  if (!user) {
    logger.log('User not found:', email);
    return null;
  }
  
  const passwordHash = simpleHash(password);
  if (user.passwordHash !== passwordHash) {
    logger.log('Password mismatch for:', email);
    return null;
  }
  
  logger.log('Authentication successful for:', email);
  return user;
};

// Register new user
export const registerUser = (
  name: string,
  email: string,
  password: string,
  role: Role = 'student'
): StoredUser | null => {
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    logger.log('User already exists:', email);
    return null;
  }
  
  const newUser: StoredUser = {
    id: `${role}-${Date.now()}`,
    name,
    email,
    role,
    avatar: role === 'student' ? '🎓' : role === 'teacher' ? '👩‍🏫' : '⚙️',
    passwordHash: simpleHash(password),
  };
  
  const users = getUsers();
  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  logger.log('User registered:', email);
  
  return newUser;
};

// Session management
export const saveSession = (user: StoredUser): void => {
  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    loginTime: Date.now(),
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
};

export const getSession = (): { userId: string; email: string; role: Role } | null => {
  const session = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!session) return null;
  
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getCurrentUser = (): StoredUser | null => {
  const session = getSession();
  if (!session) return null;
  
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
};

// Role-based authorization
export const canAccessAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

export const canAccessTeacher = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'teacher';
};

export const canManageCourses = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'teacher';
};

export const canAskQuestions = (user: User | null): boolean => {
  return user?.role === 'student';
};

export const canAnswerQuestions = (user: User | null): boolean => {
  return user?.role === 'teacher' || user?.role === 'admin';
};
