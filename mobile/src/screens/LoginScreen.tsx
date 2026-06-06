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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CustomToast from '../components/CustomToast';
import { colors } from '../theme/colors';

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
  const { height } = useWindowDimensions();
  const isAndroid = Platform.OS === 'android';
  const isCompactHeight = height < 760;
  // Get auth context
  const { login } = useAuth();

  // Form state
  const [matricule, setMatricule] = useState(initialMatricule);
  const [password, setPassword] = useState(initialPassword);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

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
  const handleLogin = async () => {
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

    try {
      // Call backend login API
      const response = await api.post('/api/auth/login', {
        matricule: matricule.toUpperCase(),
        password: password,
      });

      console.log('LOGIN RESPONSE DEBUG');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      console.log('response.data:', response.data);
      console.log('response.data.data:', response.data.data);

      // Extract data from response - backend returns { success, data: { token, data: {...} } }
      const loginData = response.data.data;
      const token = loginData.token;
      const userData = loginData.data;

      console.log('Extracted token:', token);
      console.log('Extracted user data:', JSON.stringify(userData, null, 2));

      // Use centralized auth login
      await login(token, userData);

      console.log('User logged in successfully via AuthContext');

      setIsLoading(false);

      // Show success toast
      setToastMessage('Login successful!');
      setToastType('success');
      setToastVisible(true);

      // Navigate to main app after toast duration
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);

    } catch (error: any) {
      setIsLoading(false);

      let errorMsg = error.userMessage || 'Login failed. Please check your credentials and try again.';

      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please check your internet connection and try again.';
      } else if (error.response) {
        errorMsg = error.response.data?.message || 'Login failed. Please check your credentials and try again.';
      } else if (error.request) {
        errorMsg = 'Cannot connect to server.';
      }

      setErrorMessage(errorMsg);

      // Show error toast
      setToastMessage(errorMsg);
      setToastType('error');
      setToastVisible(true);
    }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Custom Toast */}
      <CustomToast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      {/* Green header section with logo */}
      <View style={[styles.header, isAndroid && styles.androidHeader]}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={[
            styles.logo,
            isAndroid && (isCompactHeight ? styles.androidCompactLogo : styles.androidLogo),
          ]}
          resizeMode="contain"
        />
      </View>

      {/* White content section */}
      <View style={[styles.contentContainer, isAndroid && styles.androidContentContainer]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isAndroid && styles.androidScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* "Welcome back" heading */}
          <Text style={[styles.heading, isAndroid && styles.androidHeading]}>
            Welcome back
          </Text>

          {/* Error message display */}
          {/* {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null} */}

          {/* Matricule Input */}
          <View style={[styles.inputContainer, isAndroid && styles.androidInputContainer]}>
            <Text style={[styles.label, isAndroid && styles.androidLabel]}>Matricule</Text>
            <TextInput
              style={[
                styles.input,
                isAndroid && styles.androidInput,
                fieldErrors.has('matricule') && styles.inputError,
              ]}
              placeholder="Enter Matricule"
              placeholderTextColor="#999"
              value={matricule}
              onChangeText={handleMatriculeChange}
              autoCapitalize="characters"
            />
          </View>


          {/* Password Input */}
          <View style={[styles.inputContainer, isAndroid && styles.androidInputContainer]}>
            <Text style={[styles.label, isAndroid && styles.androidLabel]}>Password</Text>
            <View
              style={[
                styles.input,
                styles.passwordInputContainer,
                isAndroid && styles.androidInput,
                fieldErrors.has('password') && styles.inputError,
              ]}
            >
              <TextInput
                style={[styles.passwordInput, isAndroid && styles.androidPasswordInput]}
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
          <View style={[styles.forgotPasswordContainer, isAndroid && styles.androidForgotPasswordContainer]}>
            <TouchableOpacity
              onPress={onForgotPassword}
              style={styles.forgotPasswordLink}
            >
              <Text style={[styles.forgotPasswordText, isAndroid && styles.androidSmallText]}>
                Forgot password ?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isAndroid && styles.androidLoginButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.loginButtonText, isAndroid && styles.androidLoginButtonText]}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerLinkContainer}>
            <Text style={[styles.registerLinkText, isAndroid && styles.androidRegisterText]}>
              Don't have an account yet ?{' '}
            </Text>
            <TouchableOpacity onPress={onRegisterPress}>
              <Text style={[styles.registerLink, isAndroid && styles.androidRegisterText]}>
                Register
              </Text>
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
  // I tune Android login spacing to match the iOS proportions without the oversized logo.
  androidHeader: {
    paddingTop: 42,
    paddingBottom: 24,
  },
  androidLogo: {
    width: 128,
    height: 128,
  },
  androidCompactLogo: {
    width: 112,
    height: 112,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 24,
  },
  androidContentContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  androidScrollContent: {
    paddingBottom: 34,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    textAlign: 'center',
    marginBottom: 10,
  },
  androidHeading: {
    fontSize: 25,
    marginBottom: 8,
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
    marginTop: 10,
  },
  androidInputContainer: {
    marginTop: 8,
    marginBottom: 18,
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
  androidInput: {
    height: 48,
    borderWidth: 0.6,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 0,
    fontSize: 14,
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
  androidPasswordInput: {
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  androidForgotPasswordContainer: {
    marginBottom: 26,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#167846',
  },
  androidSmallText: {
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  androidLoginButton: {
    height: 56,
    paddingVertical: 0,
    borderRadius: 28,
    justifyContent: 'center',
    marginBottom: 18,
  },
  loginButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  androidLoginButtonText: {
    fontSize: 18,
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
  androidRegisterText: {
    fontSize: 14,
  },
});

export default LoginScreen;
