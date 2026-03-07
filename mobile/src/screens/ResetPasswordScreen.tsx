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
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';

interface ResetPasswordScreenProps {
  onBack: () => void;
  onResetSuccess: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onBack, onResetSuccess }) => {
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
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#167846" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#167846" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Heading */}
        <Text style={styles.heading}>Create new password</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your new password must be different from the previous once
        </Text>

        {/* Error message */}
        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrapper, fieldErrors.has('password') && styles.inputError]}>
            <TextInput
              style={styles.input}
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
                size={22}
                color="#CCC"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Must be at least 8 characters.</Text>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm password</Text>
          <View style={[styles.inputWrapper, fieldErrors.has('confirmPassword') && styles.inputError]}>
            <TextInput
              style={styles.input}
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
                size={22}
                color="#CCC"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Both passwords must match.</Text>
        </View>

        {/* Change Password button */}
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.changePasswordButtonText}>Change password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
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
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 40,
    lineHeight: 24,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginBottom: 8,
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
  helperText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginTop: 6,
  },
  changePasswordButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  changePasswordButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default ResetPasswordScreen;

