/**
 * LoginScreen Component
 *
 * Student login screen with form validation
 * Fields: Matricule, Password
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onRegisterPress: () => void;
  onLoginSuccess: () => void;
  onForgotPassword: () => void;
  initialMatricule?: string;
  initialPassword?: string;
  onFormChange?: (data: { matricule: string; password: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onRegisterPress,
  onLoginSuccess,
  onForgotPassword,
  initialMatricule = '',
  initialPassword = '',
  onFormChange
}) => {
  // Form state
  const [matricule, setMatricule] = useState(initialMatricule);
  const [password, setPassword] = useState(initialPassword);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  // Handle matricule change with persistence
  const handleMatriculeChange = (text: string) => {
    const upperText = text.toUpperCase();
    setMatricule(upperText);
    onFormChange?.({ matricule: upperText, password });
    if (fieldErrors.has('matricule')) {
      const newErrors = new Set(fieldErrors);
      newErrors.delete('matricule');
      setFieldErrors(newErrors);
      setErrorMessage('');
    }
  };

  // Handle password change with persistence
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    onFormChange?.({ matricule, password: text });
    if (fieldErrors.has('password')) {
      const newErrors = new Set(fieldErrors);
      newErrors.delete('password');
      setFieldErrors(newErrors);
      setErrorMessage('');
    }
  };
  const [isLoading, setIsLoading] = useState(false);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Validate matricule format (example: FE12A001)
  const validateMatricule = (mat: string): boolean => {
    const matriculeRegex = /^[A-Z]{2}\d{2}[A-Z]\d{3,4}$/i;
    return matriculeRegex.test(mat);
  };

  // Validate password
  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6;
  };

  // Handle form submission
  const handleLogin = () => {
    const errors = new Set<string>();
    setErrorMessage('');

    // Validate matricule
    if (!validateMatricule(matricule)) {
      errors.add('matricule');
      setErrorMessage('Invalid matricule format (e.g., FE12A001)');
      setFieldErrors(errors);
      return;
    }

    // Validate password
    if (!validatePassword(password)) {
      errors.add('password');
      setErrorMessage('Password must be at least 6 characters');
      setFieldErrors(errors);
      return;
    }

    // All validations passed
    setFieldErrors(new Set());
    setErrorMessage('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Login successful:', { matricule });
      onLoginSuccess();
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
      {/* Green header section with logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* White content section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* "Welcome back" heading */}
          <Text style={styles.heading}>Welcome back</Text>

          {/* Error message display */}
          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}

          {/* Matricule Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Matricule</Text>
            <TextInput
              style={[styles.input, fieldErrors.has('matricule') && styles.inputError]}
              placeholder="Enter Matricule"
              placeholderTextColor="#999"
              value={matricule}
              onChangeText={handleMatriculeChange}
              autoCapitalize="characters"
            />
          </View>


          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.input, styles.passwordInputContainer, fieldErrors.has('password') && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordContainer} onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password ?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerLinkContainer}>
            <Text style={styles.registerLinkText}>Don't have an account yet ? </Text>
            <TouchableOpacity onPress={onRegisterPress}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#167846',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#167846',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 160,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D1',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#167846',
  },
  loginButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  registerLinkText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
  },
  registerLink: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
  },
});

export default LoginScreen;


