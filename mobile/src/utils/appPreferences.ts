import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'lewa.onboarding.completed';
const EXISTING_APP_DATA_KEYS = [
  'userData',
  'studentId',
  'lewa-query-cache',
];

/**
 * Keeps first-launch preferences separate from authentication and content caches.
 */
export const appPreferences = {
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        ONBOARDING_COMPLETED_KEY
      );

      if (onboardingCompleted === 'true') {
        return true;
      }

      // Treat data from an older installation as proof that onboarding was already seen.
      const existingEntries = await AsyncStorage.multiGet(EXISTING_APP_DATA_KEYS);
      const hasExistingAppData = existingEntries.some(([, value]) => value !== null);

      if (hasExistingAppData) {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      }

      return hasExistingAppData;
    } catch {
      return false;
    }
  },

  async markOnboardingCompleted(): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  },
};
