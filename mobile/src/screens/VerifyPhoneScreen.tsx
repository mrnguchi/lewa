/**
 * VerifyPhoneScreen Component
 *
 * Screen for verifying phone number before password reset
 * User enters their phone number to receive OTP code
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import BackIconButton from '../components/BackIconButton';

interface VerifyPhoneScreenProps {
  onBack: () => void;
  onSendCode: (phoneNumber: string) => void;
  initialPhoneNumber?: string;
}

const normalizeCameroonLocalPhone = (value?: string | null) => {
  const digits = (value || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('237') && digits.length >= 12) {
    return digits.slice(3, 12);
  }

  return digits.slice(-9);
};

const VerifyPhoneScreen: React.FC<VerifyPhoneScreenProps> = ({ onBack, onSendCode, initialPhoneNumber = '' }) => {
  const isAndroid = Platform.OS === 'android';
  const { user } = useAuth();
  // Form state
  const [phoneNumber, setPhoneNumber] = useState(
    normalizeCameroonLocalPhone(initialPhoneNumber) ||
      normalizeCameroonLocalPhone(user?.phone_number)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (phoneNumber) {
      return;
    }

    const savedPhoneNumber =
      normalizeCameroonLocalPhone(initialPhoneNumber) ||
      normalizeCameroonLocalPhone(user?.phone_number);

    if (savedPhoneNumber) {
      setPhoneNumber(savedPhoneNumber);
    }
  }, [initialPhoneNumber, phoneNumber, user?.phone_number]);

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
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#167846" />
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView
          style={[styles.screen, isAndroid && styles.androidScreen]}
          edges={['top', 'bottom']}
        >
          {/* Back button */}
          <BackIconButton
            style={[styles.backButton, isAndroid && styles.androidBackButton]}
            onPress={onBack}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isAndroid && styles.androidScrollContent,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mainContent}>
              {/* Phone icon */}
              <View style={[styles.iconContainer, isAndroid && styles.androidIconContainer]}>
                <View style={[styles.iconCircle, isAndroid && styles.androidIconCircle]}>
                  <Ionicons name="call" size={isAndroid ? 38 : 50} color="#167846" />
                </View>
              </View>

              {/* Heading */}
              <Text style={[styles.heading, isAndroid && styles.androidHeading]}>
                Verify number
              </Text>

              {/* Description */}
              <Text style={[styles.description, isAndroid && styles.androidDescription]}>
                Enter the phone number associated with your account and we'll send you an OTP verification code
              </Text>

              {/* Error message */}
              {errorMessage ? (
                <Text style={[styles.errorMessage, isAndroid && styles.androidErrorMessage]}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* Phone number input */}
              <View style={[styles.phoneInputWrapper, isAndroid && styles.androidPhoneInputWrapper]}>
                <View style={[styles.countryCodeBox, isAndroid && styles.androidCountryCodeBox]}>
                  <Text style={[styles.countryCode, isAndroid && styles.androidFieldText]}>+237</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, isAndroid && styles.androidPhoneInput]}
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
            </View>

            <View style={styles.buttonArea}>
              {/* Get Code button */}
              <TouchableOpacity
                style={[styles.getCodeButton, isAndroid && styles.androidPrimaryButton]}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.getCodeButtonText, isAndroid && styles.androidPrimaryButtonText]}>
                    Get Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  androidScreen: {
    paddingHorizontal: 28,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  androidScrollContent: {
    paddingBottom: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  // I use the same rounded back button from the profile modal for this reset flow.
  androidBackButton: {
    marginTop: 14,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  androidIconContainer: {
    marginBottom: 28,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    textAlign: 'center',
    marginBottom: 16,
  },
  androidHeading: {
    fontSize: 25,
    marginBottom: 12,
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
  androidDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 15,
  },
  androidErrorMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 12,
  },
  androidPhoneInputWrapper: {
    marginBottom: 0,
    gap: 10,
  },
  countryCodeBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidCountryCodeBox: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
  },
  androidFieldText: {
    fontSize: 14,
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
  androidPhoneInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 0,
    fontSize: 14,
  },
  getCodeButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonArea: {
    paddingBottom: 8,
  },
  androidPrimaryButton: {
    height: 50,
    paddingVertical: 0,
    borderRadius: 25,
    justifyContent: 'center',
  },
  getCodeButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  androidPrimaryButtonText: {
    fontSize: 17,
  },
});

export default VerifyPhoneScreen;
