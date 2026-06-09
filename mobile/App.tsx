import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ExpoSplashScreen from "expo-splash-screen";
import * as Notifications from 'expo-notifications';
import RootNavigator from "./src/navigation";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import VerifyPhoneScreen from "./src/screens/VerifyPhoneScreen";
import VerifyOTPScreen from "./src/screens/VerifyOTPScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import { AppSyncProvider } from "./src/contexts/AppSyncContext";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ToastProvider } from "./src/contexts/ToastContext";
import { AppQueryProvider } from "./src/query/QueryProvider";
import { useAuth } from "./src/hooks/useAuth";
import {
  consumePendingNotificationTarget,
  handleNotificationResponseRouting,
  navigateToNotificationTarget,
  processLastNotificationResponse,
  syncStudentPushToken,
} from "./src/services/notifications";
import { navigationRef } from "./src/navigation/navigationRef";
import { appPreferences } from "./src/utils/appPreferences";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn:
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    "https://116e05bbb827c22fbb9594bd14c9d7ca@o4511523389374464.ingest.us.sentry.io/4511523409494016",
  environment: __DEV__ ? "development" : "production",
  sendDefaultPii: false,
  enableLogs: false,

  // Keep student, authentication, and payment details out of crash reports.
  beforeSend(event) {
    if (event.request) {
      event.request.data = undefined;
      event.request.cookies = undefined;
      event.request.headers = undefined;
    }

    event.user = event.user?.id ? { id: event.user.id } : undefined;
    return event;
  },
});

// Keep the native splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showVerifyPhone, setShowVerifyPhone] = useState(false);
  const [showVerifyOTP, setShowVerifyOTP] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const lastHandledNotificationRef = useRef<string | null>(null);

  // Persistent state for forms
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [loginFormData, setLoginFormData] = useState({ matricule: '', password: '' });
  const [verifyPhoneData, setVerifyPhoneData] = useState('');

  useEffect(() => {
    // Hide the native splash screen immediately when app loads
    ExpoSplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Load first-launch state while the custom splash animation is visible.
    appPreferences.hasCompletedOnboarding().then((completed) => {
      if (isMounted) {
        setHasCompletedOnboarding(completed);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Sync the latest push token once the user is authenticated.
    if (!isAuthenticated || !user?.id) {
      return;
    }

    syncStudentPushToken(user.id).catch(() => undefined);
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const notificationIdentifier = response.notification.request.identifier;

      if (lastHandledNotificationRef.current === notificationIdentifier) {
        return;
      }

      lastHandledNotificationRef.current = notificationIdentifier;
      handleNotificationResponseRouting({
        data: response.notification.request.content.data,
        isAuthenticated,
      }).catch(() => undefined);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isNavigationReady) {
      return;
    }

    consumePendingNotificationTarget()
      .then((target) => {
        if (target) {
          navigateToNotificationTarget(target);
        }
      })
      .catch(() => undefined);
  }, [isAuthenticated, isNavigationReady]);

  useEffect(() => {
    if (!isAuthenticated || !isNavigationReady) {
      return;
    }

    processLastNotificationResponse(isAuthenticated).catch(() => undefined);
  }, [isAuthenticated, isNavigationReady]);

  useEffect(() => {
    // Return logged-out users to the welcome screen once startup flows are finished.
    if (authLoading || showSplash || showOnboarding || isAuthenticated) {
      return;
    }

    setShowRegister(false);
    setShowLogin(false);
    setShowVerifyPhone(false);
    setShowVerifyOTP(false);
    setShowResetPassword(false);
    setShowWelcome(true);
  }, [authLoading, isAuthenticated, showOnboarding, showSplash]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);

    if (isAuthenticated) {
      return;
    }

    if (hasCompletedOnboarding) {
      setShowWelcome(true);
      return;
    }

    setShowOnboarding(true);
  }, [hasCompletedOnboarding, isAuthenticated]);

  const handleOnboardingFinish = useCallback(async () => {
    await appPreferences.markOnboardingCompleted();
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    setShowWelcome(true);
  }, []);

  const handleRegister = useCallback(() => {
    setShowWelcome(false);
    setShowRegister(true);
  }, []);

  const handleLogin = useCallback(() => {
    setShowWelcome(false);
    setShowLogin(true);
  }, []);

  const handleGoToLogin = useCallback(() => {
    setShowRegister(false);
    setShowLogin(true);
  }, []);

  const handleGoToRegister = useCallback(() => {
    setShowLogin(false);
    setShowRegister(true);
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    // After successful registration, navigate to main app
    setShowRegister(false);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    // After successful login, navigate to main app
    setShowLogin(false);
  }, []);

  // Password reset flow handlers
  const handleForgotPassword = useCallback(() => {
    setShowLogin(false);
    setShowVerifyPhone(true);
  }, []);

  const handleVerifyPhoneBack = useCallback(() => {
    setShowVerifyPhone(false);
    setShowLogin(true);
  }, []);

  const handleSendCode = useCallback((phoneNumber: string) => {
    setVerifyPhoneData(phoneNumber);
    setUserPhoneNumber(phoneNumber);
    setShowVerifyPhone(false);
    setShowVerifyOTP(true);
  }, []);

  const handleVerifyOTPBack = useCallback(() => {
    setShowVerifyOTP(false);
    setShowVerifyPhone(true);
  }, []);

  const handleVerifySuccess = useCallback(() => {
    setShowVerifyOTP(false);
    setShowResetPassword(true);
  }, []);

  const handleResetPasswordBack = useCallback(() => {
    setShowResetPassword(false);
    setShowVerifyOTP(true);
  }, []);

  const handleResetSuccess = useCallback(() => {
    setShowResetPassword(false);
    setShowLogin(true);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        isReady={!authLoading && hasCompletedOnboarding !== null}
        onFinish={handleSplashFinish}
      />
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />;
  }

  if (showWelcome) {
    return <WelcomeScreen onRegister={handleRegister} onLogin={handleLogin} />;
  }

  if (showRegister) {
    return <RegisterScreen onLoginPress={handleGoToLogin} onRegisterSuccess={handleRegisterSuccess} />;
  }

  if (showLogin) {
    return (
      <LoginScreen
        onRegisterPress={handleGoToRegister}
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={handleForgotPassword}
        initialMatricule={loginFormData.matricule}
        initialPassword={loginFormData.password}
        onFormChange={setLoginFormData}
      />
    );
  }

  if (showVerifyPhone) {
    return (
      <VerifyPhoneScreen
        onBack={handleVerifyPhoneBack}
        onSendCode={handleSendCode}
        initialPhoneNumber={verifyPhoneData}
      />
    );
  }

  if (showVerifyOTP) {
    return <VerifyOTPScreen onBack={handleVerifyOTPBack} onVerifySuccess={handleVerifySuccess} phoneNumber={userPhoneNumber} />;
  }

  if (showResetPassword) {
    return <ResetPasswordScreen onBack={handleResetPasswordBack} onResetSuccess={handleResetSuccess} />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setIsNavigationReady(true)}>
      <AppSyncProvider>
        <RootNavigator />
      </AppSyncProvider>
    </NavigationContainer>
  );
}

export default Sentry.wrap(function App() {
  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </AppQueryProvider>
    </SafeAreaProvider>
  );
});
