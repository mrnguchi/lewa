/**
 * WelcomeScreen Component
 * 
 * This screen is displayed after onboarding and allows users to choose
 * between registering a new account or logging into an existing one.
 * 
 * Features:
 * - Green gradient background matching brand color
 * - Welcome illustration
 * - Two action buttons: Register (white) and Login (outlined)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

interface WelcomeScreenProps {
  onRegister: () => void;
  onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onRegister, onLogin }) => {
  const { width, height } = useWindowDimensions();
  const isAndroid = Platform.OS === 'android';
  const isCompactHeight = height < 760;
  // I keep Android spacing separate so the hero and buttons do not feel oversized.
  const androidImageHeight = Math.min(
    height * (isCompactHeight ? 0.38 : 0.42),
    isCompactHeight ? 320 : 365
  );
  const androidTaglineWidth = Math.min(width - 28, 470);

  // Load Poppins fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        isAndroid && styles.androidContainer,
      ]}
      edges={['top', 'bottom']}
    >
      {/* Welcome heading */}
      <Text style={[styles.welcomeText, isAndroid && styles.androidWelcomeText]}>
        WELCOME !
      </Text>

      {/* Welcome illustration */}
      <View
        style={[
          styles.imageContainer,
          isAndroid && styles.androidImageContainer,
          isAndroid && {
            height: androidImageHeight,
            maxHeight: androidImageHeight,
            marginBottom: isCompactHeight ? 28 : 36,
          },
        ]}
      >
        <Image
          source={require('../../assets/welcome_screen.png')}
          style={styles.image}
          resizeMode="contain"
        />
        {/* Tagline text */}
        <Text
          style={[
            styles.tagline,
            isAndroid && styles.androidTagline,
            isAndroid && { width: androidTaglineWidth },
          ]}
        >
          Pay your fees easily and securely. No queues,{'\n'}No paper receipts
        </Text>
      </View>

      

      {/* Action buttons container */}
      <View style={[styles.buttonsContainer, isAndroid && styles.androidButtonsContainer]}>
        {/* Register button */}
        <TouchableOpacity
          style={[styles.registerButton, isAndroid && styles.androidButton]}
          onPress={onRegister}
        >
          <Text style={[styles.registerButtonText, isAndroid && styles.androidButtonText]}>
            Register
          </Text>
        </TouchableOpacity>

        {/* Login button  */}
        <TouchableOpacity
          style={[styles.loginButton, isAndroid && styles.androidButton]}
          onPress={onLogin}
        >
          <Text style={[styles.loginButtonText, isAndroid && styles.androidButtonText]}>
            Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Main container with green background
  container: {
    flex: 1,
    backgroundColor: '#167846',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  androidContainer: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 32,
  },
  // Loading state container
  loadingContainer: {
    justifyContent: 'center',
  },
  // "WELCOME !" heading
  welcomeText: {
    fontSize: 32,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: -50,
    paddingTop: 55,
  },
  androidWelcomeText: {
    fontSize: 28,
    letterSpacing: 3.2,
    marginBottom: 0,
    paddingTop: 0,
  },
  // Container for the welcome illustration
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: 400,
    marginBottom: 50,
  },
  androidImageContainer: {
    flex: 0,
  },
  // Welcome illustration image
  image: {
    width: '100%',
    height: '100%',
  },
  // Tagline text below the image
  tagline: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    //marginBottom: 4,
    marginTop: -60,
  },
  androidTagline: {
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: -20,
  },
  // Container for both buttons
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  androidButtonsContainer: {
    gap: 14,
  },
  // Register button - white background
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
  },
  androidButton: {
    height: 50,
    paddingVertical: 0,
    borderRadius: 25,
    justifyContent: 'center',
  },
  // Register button text - green color
  registerButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
  },
  androidButtonText: {
    fontSize: 18,
  },
  // Login button - outlined with white border
  loginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  // Login button text - white color
  loginButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default WelcomeScreen;
