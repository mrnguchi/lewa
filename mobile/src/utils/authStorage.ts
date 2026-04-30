import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User data interface matching backend response
 */
export interface UserData {
  id: string;
  full_name: string;
  matricule: string;
  phone_number: string;
  faculty: string;
  department: string;
  level: number;
  fee_status: 'PAID' | 'PARTIAL' | 'REQUIRED' | 'NOT_PAID';
  notifications_enabled: boolean;
  is_active: boolean;
  subscribed: boolean;
  role?: string;
}

/**
 * Centralized authentication storage utility
 * Handles all AsyncStorage operations for auth data
 */
export const authStorage = {
  /**
   * Save authentication data (token + user data)
   */
  async saveAuthData(token: string, userData: UserData): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('authToken', token),
        AsyncStorage.setItem('studentId', userData.id),
        AsyncStorage.setItem('userData', JSON.stringify(userData)),
      ]);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch {
      return null;
    }
  },

  /**
   * Get user data
   */
  async getUserData(): Promise<UserData | null> {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (!data) return null;

      // Safely parse JSON
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  },

  /**
   * Get student ID
   */
  async getStudentId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('studentId');
    } catch {
      return null;
    }
  },

  /**
   * Update user data (e.g., after payment updates fee_status)
   */
  async updateUserData(userData: Partial<UserData>): Promise<UserData | null> {
    try {
      const currentData = await this.getUserData();
      if (currentData) {
        const updatedData = { ...currentData, ...userData };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
        return updatedData;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Clears every AsyncStorage entry owned by the app during logout.
   */
  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const userData = await this.getUserData();
      return token !== null && userData !== null;
    } catch {
      return false;
    }
  },
};
