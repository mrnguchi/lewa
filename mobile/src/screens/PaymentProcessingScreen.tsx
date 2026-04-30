/**
 * PaymentProcessingScreen Component
 *
 * Screen for processing payment with loading animation and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import SpinningLoader from '../components/SpinningLoader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_POLL_DURATION_MS = 3 * 60 * 1000;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

const getNextPollDelay = (pollCount: number) => {
  if (pollCount < 6) {
    return 5000;
  }

  if (pollCount < 18) {
    return 10000;
  }

  return 20000;
};

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeInstallment: 'full' | 'half'; amount: number };
  ConfirmNumber: { feeInstallment: 'full' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { reference: string };
  PaymentProcessing: { reference: string };
  PaymentSuccessful: { reference: string };
};

type PaymentProcessingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentProcessing'>;
type PaymentProcessingScreenRouteProp = RouteProp<RootStackParamList, 'PaymentProcessing'>;
type PaymentModalMode = 'failed' | 'unverified';

const PaymentProcessingScreen: React.FC = () => {
  const navigation = useNavigation<PaymentProcessingScreenNavigationProp>();
  const route = useRoute<PaymentProcessingScreenRouteProp>();
  const { reference } = route.params;

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMode, setModalMode] = useState<PaymentModalMode>('unverified');
  const [modalTitle, setModalTitle] = useState('Payment status pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [pollRun, setPollRun] = useState(0);
  const paymentCode = '*126#';

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;
    let isStopped = false;
    let pollCount = 0;
    let consecutivePollErrors = 0;
    const startedAt = Date.now();

    const cleanupFailedPayment = async () => {
      try {
        await api.delete(`/api/payments/${reference}`, {
          suppressErrorToast: true,
        } as any);
      } catch {
        // Failed payment cleanup should not block the student's next action.
      }
    };

    const stopPollingWithModal = (
      mode: PaymentModalMode,
      title: string,
      message: string
    ) => {
      if (isStopped) {
        return;
      }

      isStopped = true;

      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }

      setModalMode(mode);
      setModalTitle(title);
      setErrorMessage(message);
      setShowErrorModal(true);
    };

    const scheduleNextPoll = () => {
      if (isStopped) {
        return;
      }

      pollTimeout = setTimeout(
        pollPaymentStatus,
        getNextPollDelay(pollCount)
      );
    };

    const pollPaymentStatus = async () => {
      if (isStopped) {
        return;
      }

      try {
        const response = await api.get(`/api/payments/reference/${reference}`, {
          timeout: 10000,
          suppressErrorToast: true,
        } as any);
        const paymentData = response.data.data;

        setPaymentType(paymentData.paymentType ?? null);
        consecutivePollErrors = 0;

        if (paymentData.status === 'successful') {
          isStopped = true;

          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }

          navigation.replace('PaymentSuccessful', { reference });
          return;
        }

        if (paymentData.status === 'failed') {
          isStopped = true;

          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }

          await cleanupFailedPayment();
          setModalMode('failed');
          setModalTitle('Payment failed');
          setErrorMessage('Payment failed. No money was received. Please try again.');
          setShowErrorModal(true);
          return;
        }

        if (!paymentData.providerReference && pollCount >= 2) {
          stopPollingWithModal(
            'unverified',
            'Payment not started',
            'We could not confirm that the payment request started. Please go back and try again.'
          );
          return;
        }

        if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
          stopPollingWithModal(
            'unverified',
            'Still checking payment',
            'We could not verify the payment yet. If you approved it on your phone, use Check again before starting a new payment.'
          );
          return;
        }
      } catch {
        consecutivePollErrors++;

        if (
          consecutivePollErrors >= MAX_CONSECUTIVE_POLL_ERRORS ||
          Date.now() - startedAt >= MAX_POLL_DURATION_MS
        ) {
          stopPollingWithModal(
            'unverified',
            'Connection interrupted',
            'We could not verify the payment because of your connection. If you approved the request, use Check again when your internet is stable.'
          );
          return;
        }
      } finally {
        pollCount++;

        if (!isStopped) {
          scheduleNextPoll();
        }
      }
    };

    pollPaymentStatus();

    return () => {
      isStopped = true;

      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [reference, navigation, pollRun]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRetry = () => {
    setShowErrorModal(false);

    if (modalMode === 'failed') {
      if (paymentType === 'fee') {
        navigation.navigate('FeeSelection');
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }

      return;
    }

    setErrorMessage('');
    setPollRun((currentRun) => currentRun + 1);
  };

  const handleCancel = () => {
    setShowErrorModal(false);
    // Navigate back to Home
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={styles.container}>
      {/* Loading State */}
      <Text style={styles.title}>Complete payment on{'\n'}your phone</Text>

      <SpinningLoader size={100} />

      <Text style={styles.instruction}>
        Dial <Text style={styles.code}>{paymentCode}</Text> and confirm payment
      </Text>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Error Icon */}
            <View style={styles.errorIconContainer}>
              <View
                style={[
                  styles.errorIconCircle,
                  modalMode === 'unverified' && styles.pendingIconCircle,
                ]}
              >
                <Ionicons
                  name={modalMode === 'failed' ? 'close-circle-outline' : 'hourglass-outline'}
                  size={32}
                  color={modalMode === 'failed' ? '#DC2626' : colors.primary}
                />
                <View style={styles.warningBadge}>
                  <Ionicons name="warning" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Error Title */}
            <Text style={styles.modalTitle}>{modalTitle}</Text>

            {/* Error Message */}
            <Text style={styles.modalMessage}>
              {errorMessage || `Dial ${paymentCode} and confirm payment within 1 mins of initiating payment`}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText} numberOfLines={1}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tryAgainButton} onPress={handleRetry}>
                <Text style={styles.tryAgainButtonText} numberOfLines={1}>
                  {modalMode === 'failed' ? 'Start over' : 'Check again'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,

  },
  title: {
    fontSize: 30,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 40,
  },
  instruction: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginTop: 60,
  },
  code: {
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 26,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pendingIconCircle: {
    backgroundColor: colors.primaryLight,
  },
  warningBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    paddingHorizontal: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
  tryAgainButton: {
    flex: 1,
    backgroundColor: colors.primary,
    minHeight: 56,
    paddingHorizontal: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAgainButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default PaymentProcessingScreen;
