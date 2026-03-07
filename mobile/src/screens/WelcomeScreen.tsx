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
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

interface WelcomeScreenProps {
  onRegister: () => void;
  onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onRegister, onLogin }) => {
  // Load Poppins fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Welcome heading */}
      <Text style={styles.welcomeText}>WELCOME !</Text>

      {/* Welcome illustration */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/welcome_screen.png')}
          style={styles.image}
          resizeMode="contain"
        />
        {/* Tagline text */}
      <Text style={styles.tagline}>
        Pay your fees easily and securely. No queues,{'\n'}No paper receipts
      </Text>
      </View>

      

      {/* Action buttons container */}
      <View style={styles.buttonsContainer}>
        {/* Register button */}
        <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        {/* Login button  */}
        <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  // Container for the welcome illustration
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: 400,
    marginBottom: 50,
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
  // Container for both buttons
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  // Register button - white background
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
  },
  // Register button text - green color
  registerButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
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
