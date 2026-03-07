import { useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as ExpoSplashScreen from "expo-splash-screen";
import RootNavigator from "./src/navigation";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import VerifyPhoneScreen from "./src/screens/VerifyPhoneScreen";
import VerifyOTPScreen from "./src/screens/VerifyOTPScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";

// Keep the native splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showVerifyPhone, setShowVerifyPhone] = useState(false);
  const [showVerifyOTP, setShowVerifyOTP] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Persistent state for forms
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [loginFormData, setLoginFormData] = useState({ matricule: '', password: '' });
  const [verifyPhoneData, setVerifyPhoneData] = useState('');

  useEffect(() => {
    // Hide the native splash screen immediately when app loads
    ExpoSplashScreen.hideAsync();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    setShowOnboarding(true);
  }, []);

  const handleOnboardingFinish = useCallback(() => {
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
    console.log("Registration successful - navigating to main app");
  }, []);

  const handleLoginSuccess = useCallback(() => {
    // After successful login, navigate to main app
    setShowLogin(false);
    console.log("Login successful - navigating to main app");
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
    console.log("Password reset successful - returning to login");
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
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
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
