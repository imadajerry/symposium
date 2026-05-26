import type { Course, User, Role } from '../types';

// Initial mock courses
export const INITIAL_COURSES: Course[] = [
  { 
    id: 'c1', 
    title: 'Introduction to Physics', 
    description: 'Mechanics and Motion', 
    materialType: 'image', 
    materialUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    id: 'c2', 
    title: 'Calculus I', 
    description: 'Derivatives and Integrals', 
    materialType: 'image', 
    materialUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    id: 'c3', 
    title: 'Computer Science 101', 
    description: 'Programming Fundamentals', 
    materialType: 'pdf'
  },
];

// Initial mock users by role
export const INITIAL_USERS: Record<Role, User> = {
  student: { id: 'u1', name: 'Alex Student', role: 'student', avatar: '🎓' },
  teacher: { id: 'u2', name: 'Prof. Sarah', role: 'teacher', avatar: '👩‍🏫' },
  admin: { id: 'u3', name: 'SysAdmin', role: 'admin', avatar: '⚙️' },
};

// Sample questions for simulated real-time
export const SAMPLE_QUESTIONS = [
  'Can you explain the last formula?',
  'I am confused about the assignment.',
  'What time is the exam?',
  'Could you go over this topic again?',
  'Is this going to be on the test?',
];
