import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authStorage, UserData } from '../utils/authStorage';
import { api } from '../services/api';

/**
 * Auth context type definition
 */
interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: UserData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

/**
 * Create Auth Context
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  refreshUserData: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the entire app to provide authentication state
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load stored auth data on app startup
   */
  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * Restores the local session first so returning users can enter quickly.
   */
  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUserData(),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        // Refresh quietly after local restoration without blocking app startup.
        refreshStoredUser(storedUser.id).catch(() => undefined);
      } else if (storedToken || storedUser) {
        await authStorage.clearAuthData();
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refreshes cached profile data and clears only sessions rejected by the backend.
   */
  const refreshStoredUser = async (studentId: string) => {
    try {
      const response = await api.get(`/api/students/${studentId}`, {
        suppressErrorToast: true,
      } as any);
      const freshUserData = response.data.data;

      const updatedUser = await authStorage.updateUserData(freshUserData);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        await authStorage.clearAuthData();
        setToken(null);
        setUser(null);
      }
    }
  };

  /**
   * Login user and store auth data
   */
  const login = async (authToken: string, userData: UserData) => {
    try {
      await authStorage.saveAuthData(authToken, userData);

      setToken(authToken);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Logout user and clear auth data
   */
  const logout = async () => {
    try {
      await authStorage.clearAuthData();
      setToken(null);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Update user data (e.g., after payment)
   */
  const updateUser = async (userData: Partial<UserData>) => {
    try {
      const updatedUser = await authStorage.updateUserData(userData);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Refresh user data from backend
   */
  const refreshUserData = async () => {
    const studentId = await authStorage.getStudentId();
    if (studentId) {
      await refreshStoredUser(studentId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        updateUser,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
