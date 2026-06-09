import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SECURE_TOKEN_KEY = 'lewa.auth.token';
const LEGACY_TOKEN_KEY = 'authToken';
const STUDENT_ID_KEY = 'studentId';
const USER_DATA_KEY = 'userData';

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
  profile_image_url?: string | null;
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
   * Stores the token securely and removes the older AsyncStorage copy.
   */
  async saveToken(token: string): Promise<void> {
    const secureStorageAvailable = await SecureStore.isAvailableAsync();

    if (secureStorageAvailable) {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      return;
    }

    await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
  },

  /**
   * Save authentication data (token + user data)
   */
  async saveAuthData(token: string, userData: UserData): Promise<void> {
    try {
      await Promise.all([
        this.saveToken(token),
        AsyncStorage.setItem(STUDENT_ID_KEY, userData.id),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
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
      const secureStorageAvailable = await SecureStore.isAvailableAsync();

      if (secureStorageAvailable) {
        const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        if (secureToken) {
          return secureToken;
        }
      }

      // Migrate sessions created before SecureStore was introduced.
      const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacyToken && secureStorageAvailable) {
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacyToken);
        await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      }

      return legacyToken;
    } catch {
      return AsyncStorage.getItem(LEGACY_TOKEN_KEY);
    }
  },

  /**
   * Get user data
   */
  async getUserData(): Promise<UserData | null> {
    try {
      const data = await AsyncStorage.getItem(USER_DATA_KEY);
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
      return await AsyncStorage.getItem(STUDENT_ID_KEY);
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
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedData));
        return updatedData;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Clears only session data so onboarding and content caches remain intact.
   */
  async clearAuthData(): Promise<void> {
    try {
      const secureStorageAvailable = await SecureStore.isAvailableAsync();

      await Promise.all([
        secureStorageAvailable
          ? SecureStore.deleteItemAsync(SECURE_TOKEN_KEY)
          : Promise.resolve(),
        AsyncStorage.multiRemove([
          LEGACY_TOKEN_KEY,
          STUDENT_ID_KEY,
          USER_DATA_KEY,
        ]),
      ]);
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
