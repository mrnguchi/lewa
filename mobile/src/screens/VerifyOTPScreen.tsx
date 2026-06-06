/**
 * VerifyOTPScreen Component
 *
 * Screen for entering OTP code sent to user's phone
 * Includes 6-digit OTP input and 1-minute resend timer
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { colors } from '../theme/colors';
import BackIconButton from '../components/BackIconButton';

interface VerifyOTPScreenProps {
  onBack: () => void;
  onVerifySuccess: () => void;
  phoneNumber: string;
}

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({ onBack, onVerifySuccess, phoneNumber }) => {
  const isAndroid = Platform.OS === 'android';
  // OTP state - 6 digits
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Timer state
  const [timer, setTimer] = useState(60); // 60 seconds = 1 minute
  const [canResend, setCanResend] = useState(false);

  // Refs for OTP inputs
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrorMessage('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle verify
  const handleVerify = () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Simulate API call to verify OTP
    setTimeout(() => {
      setIsLoading(false);
      // In real app, check if OTP is valid from backend
      console.log('Verifying OTP:', otpCode);
      onVerifySuccess();
    }, 1500);
  };

  // Handle resend OTP
  const handleResendOTP = () => {
    if (!canResend) return;

    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setErrorMessage('');

    // Simulate API call to resend OTP
    console.log('Resending OTP to:', phoneNumber);
  };

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              {/* Heading */}
              <Text style={[styles.heading, isAndroid && styles.androidHeading]}>
                OTP Verification
              </Text>

              {/* Description */}
              <Text style={[styles.description, isAndroid && styles.androidDescription]}>
                Enter code sent to <Text style={styles.phoneNumber}>{phoneNumber}</Text>
              </Text>

              {/* Error message */}
              {errorMessage ? (
                <Text style={[styles.errorMessage, isAndroid && styles.androidErrorMessage]}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* OTP Input boxes */}
              <View style={[styles.otpContainer, isAndroid && styles.androidOtpContainer]}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[styles.otpInput, isAndroid && styles.androidOtpInput]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend section */}
              <View style={[styles.resendContainer, isAndroid && styles.androidResendContainer]}>
                <Text style={[styles.resendText, isAndroid && styles.androidBodyText]}>
                  Didn't receive code ?
                </Text>
                <View style={styles.resendRow}>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={!canResend}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        isAndroid && styles.androidResendLink,
                        !canResend && styles.resendDisabled,
                      ]}
                    >
                      RESEND OTP
                    </Text>
                  </TouchableOpacity>
                  {!canResend && (
                    <Text style={[styles.timerText, isAndroid && styles.androidBodyText]}>
                      {formatTimer(timer)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.buttonArea}>
              {/* Verify button */}
              <TouchableOpacity
                style={[styles.verifyButton, isAndroid && styles.androidPrimaryButton]}
                onPress={handleVerify}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.verifyButtonText, isAndroid && styles.androidPrimaryButtonText]}>
                    Verify
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
    marginBottom: 40,
  },
  androidDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 32,
  },
  phoneNumber: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 8,
  },
  androidOtpContainer: {
    marginBottom: 32,
    gap: 7,
  },
  otpInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingVertical: 20,
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  androidOtpInput: {
    minHeight: 50,
    borderRadius: 12,
    paddingVertical: 8,
    fontSize: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  androidResendContainer: {
    marginBottom: 0,
  },
  resendText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  androidBodyText: {
    fontSize: 14,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resendLink: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
  },
  androidResendLink: {
    fontSize: 14,
  },
  resendDisabled: {
    color: '#999',
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
  },
  verifyButton: {
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
  verifyButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  androidPrimaryButtonText: {
    fontSize: 17,
  },
});

export default VerifyOTPScreen;
