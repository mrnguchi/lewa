/**
 * VerifyPhoneScreen Component
 *
 * Screen for verifying phone number before password reset
 * User enters their phone number to receive OTP code
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface VerifyPhoneScreenProps {
  onBack: () => void;
  onSendCode: (phoneNumber: string) => void;
  initialPhoneNumber?: string;
}

const VerifyPhoneScreen: React.FC<VerifyPhoneScreenProps> = ({ onBack, onSendCode, initialPhoneNumber = '' }) => {
  // Form state
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Validate Cameroon phone number (must be 9 digits)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-7]\d{8}$/;
    return phoneRegex.test(phone);
  };

  // Handle send code
  const handleSendCode = () => {
    setErrorMessage('');

    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Invalid phone number (must be 9 digits starting with 6 or 7)');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Sending OTP to:', phoneNumber);
      onSendCode(phoneNumber);
    }, 1500);
  };

  // Show loading indicator while fonts load
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#167846" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#167846" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Phone icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="call" size={50} color="#167846" />
          </View>
        </View>

      {/* Heading */}
      <Text style={styles.heading}>Verify number</Text>

      {/* Description */}
      <Text style={styles.description}>
        Enter the phone number associated with your account and we'll send you an OTP verification code
      </Text>

      {/* Error message */}
      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      {/* Phone number input */}
      <View style={styles.phoneInputWrapper}>
        <View style={styles.countryCodeBox}>
          <Text style={styles.countryCode}>+237</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="677 - 268 - 983"
          placeholderTextColor="#999"
          value={phoneNumber}
          onChangeText={(text) => {
            const cleaned = text.replace(/\D/g, '').slice(0, 9);
            setPhoneNumber(cleaned);
            setErrorMessage('');
          }}
          keyboardType="phone-pad"
          maxLength={9}
        />
      </View>

      {/* Get Code button */}
      <TouchableOpacity
        style={styles.getCodeButton}
        onPress={handleSendCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.getCodeButtonText}>Get Code</Text>
        )}
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 90,
    marginBottom: 40,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginLeft: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 15,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 12,
  },
  countryCodeBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  getCodeButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  getCodeButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default VerifyPhoneScreen;
