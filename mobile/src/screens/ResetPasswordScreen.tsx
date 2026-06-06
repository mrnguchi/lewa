/**
 * ResetPasswordScreen Component
 *
 * Screen for creating a new password after OTP verification
 * Validates password strength and matching
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
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import BackIconButton from '../components/BackIconButton';

interface ResetPasswordScreenProps {
  onBack: () => void;
  onResetSuccess: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onBack, onResetSuccess }) => {
  const isAndroid = Platform.OS === 'android';
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Validate password strength (minimum 8 characters)
  const validatePassword = (pass: string): boolean => {
    return pass.length >= 8;
  };

  // Handle password reset
  const handleResetPassword = () => {
    const errors = new Set<string>();
    setErrorMessage('');

    // Validate password
    if (!validatePassword(password)) {
      errors.add('password');
      setErrorMessage('Password must be at least 8 characters');
      setFieldErrors(errors);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      errors.add('confirmPassword');
      setErrorMessage('Both passwords must match');
      setFieldErrors(errors);
      return;
    }

    // All validations passed
    setFieldErrors(new Set());
    setErrorMessage('');
    setIsLoading(true);

    // Simulate API call to reset password
    setTimeout(() => {
      setIsLoading(false);
      console.log('Password reset successful');
      onResetSuccess();
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.mainContent}>
              {/* Heading */}
              <Text style={[styles.heading, isAndroid && styles.androidHeading]}>
                Create new password
              </Text>

              {/* Description */}
              <Text style={[styles.description, isAndroid && styles.androidDescription]}>
                Your new password must be different from the previous once
              </Text>

              {/* Error message */}
              {errorMessage ? (
                <Text style={[styles.errorMessage, isAndroid && styles.androidErrorMessage]}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* Password Input */}
              <View style={[styles.inputContainer, isAndroid && styles.androidInputContainer]}>
                <Text style={[styles.label, isAndroid && styles.androidLabel]}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isAndroid && styles.androidInputWrapper,
                    fieldErrors.has('password') && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={[styles.input, isAndroid && styles.androidInput]}
                    placeholder="Enter new password"
                    placeholderTextColor="#CCC"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setFieldErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('password');
                        return newErrors;
                      });
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={isAndroid ? 20 : 22}
                      color="#CCC"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperText, isAndroid && styles.androidHelperText]}>
                  Must be at least 8 characters.
                </Text>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, isAndroid && styles.androidInputContainer]}>
                <Text style={[styles.label, isAndroid && styles.androidLabel]}>Confirm password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isAndroid && styles.androidInputWrapper,
                    fieldErrors.has('confirmPassword') && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={[styles.input, isAndroid && styles.androidInput]}
                    placeholder="Enter new password"
                    placeholderTextColor="#CCC"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setFieldErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('confirmPassword');
                        return newErrors;
                      });
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={isAndroid ? 20 : 22}
                      color="#CCC"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperText, isAndroid && styles.androidHelperText]}>
                  Both passwords must match.
                </Text>
              </View>
            </View>

            <View style={styles.buttonArea}>
              {/* Change Password button */}
              <TouchableOpacity
                style={[styles.changePasswordButton, isAndroid && styles.androidPrimaryButton]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.changePasswordButtonText,
                      isAndroid && styles.androidPrimaryButtonText,
                    ]}
                  >
                    Change password
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
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    marginBottom: 12,
  },
  androidHeading: {
    fontSize: 25,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 40,
    lineHeight: 24,
  },
  androidDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 32,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    marginBottom: 15,
  },
  androidErrorMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 24,
  },
  androidInputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginBottom: 8,
  },
  androidLabel: {
    fontSize: 13,
    marginBottom: 7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D1',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  androidInputWrapper: {
    height: 48,
    borderWidth: 0.6,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  androidInput: {
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginTop: 6,
  },
  androidHelperText: {
    fontSize: 11,
    marginTop: 5,
  },
  changePasswordButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  androidPrimaryButton: {
    height: 50,
    paddingVertical: 0,
    borderRadius: 25,
    justifyContent: 'center',
  },
  buttonArea: {
    paddingBottom: 8,
  },
  changePasswordButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  androidPrimaryButtonText: {
    fontSize: 17,
  },
});

export default ResetPasswordScreen;
