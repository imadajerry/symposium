import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Role } from '../types';
import { api, tokenStore } from '../utils/api';
import { logger } from '../utils/config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: Role) => Promise<boolean>;
  logout: () => void;
  // Permissions
  canManageCourses: boolean;
  canAskQuestions: boolean;
  canAnswerQuestions: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = tokenStore.get();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.me();
        logger.log('Restored backend session for:', currentUser.email);
        setUser(currentUser);
      } catch (error) {
        logger.warn('Unable to restore backend session', error);
        tokenStore.clear();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      setUser(response.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      logger.warn('Login failed', error);
      setIsLoading(false);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: Role = 'student'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await api.register(name, email, password, role);
      setUser(response.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      logger.warn('Registration failed', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    tokenStore.clear();
    logger.log('User logged out');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    canManageCourses: user?.role === 'admin' || user?.role === 'teacher',
    canAskQuestions: user?.role === 'student',
    canAnswerQuestions: user?.role === 'teacher' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
