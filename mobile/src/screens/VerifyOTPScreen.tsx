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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';

interface VerifyOTPScreenProps {
  onBack: () => void;
  onVerifySuccess: () => void;
  phoneNumber: string;
}

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({ onBack, onVerifySuccess, phoneNumber }) => {
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

      {/* Heading */}
      <Text style={styles.heading}>OTP Verification</Text>

      {/* Description */}
      <Text style={styles.description}>
        Enter code sent to <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      </Text>

      {/* Error message */}
      {errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}

      {/* OTP Input boxes */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={styles.otpInput}
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
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive code ?</Text>
        <View style={styles.resendRow}>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={!canResend}
          >
            <Text style={[styles.resendLink, !canResend && styles.resendDisabled]}>
              RESEND OTP
            </Text>
          </TouchableOpacity>
          {!canResend && (
            <Text style={styles.timerText}>{formatTimer(timer)}</Text>
          )}
        </View>
      </View>

      {/* Verify button */}
      <TouchableOpacity
        style={styles.verifyButton}
        onPress={handleVerify}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify</Text>
        )}
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    marginBottom: 60,
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
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 8,
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  resendText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    marginBottom: 8,
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
  verifyButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default VerifyOTPScreen;
