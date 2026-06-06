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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import SpinningLoader from '../components/SpinningLoader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { showErrorToast, showSuccessToast } from '../services/toast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_POLL_DURATION_MS = 60 * 1000;
const POLL_DELAY_MS = 5000;
const FORCE_PROVIDER_CHECK_MS = 20 * 1000;
const NOT_STARTED_GRACE_MS = 15 * 1000;

const getPaymentHelp = (paymentMethod?: string | null) => {
  const method = paymentMethod?.toLowerCase() ?? '';

  if (method.includes('orange')) {
    return {
      code: '#150#',
      methodLabel: 'Orange Money',
    };
  }

  return {
    code: '*126#',
    methodLabel: 'MTN MoMo',
  };
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
type PaymentModalMode = 'failed' | 'pending' | 'connection' | 'notStarted';

const PaymentProcessingScreen: React.FC = () => {
  const navigation = useNavigation<PaymentProcessingScreenNavigationProp>();
  const route = useRoute<PaymentProcessingScreenRouteProp>();
  const { reference } = route.params;
  const isAndroid = Platform.OS === 'android';

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMode, setModalMode] = useState<PaymentModalMode>('pending');
  const [modalTitle, setModalTitle] = useState('Payment status pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [pollRun, setPollRun] = useState(0);
  const [isCancellingPendingPayment, setIsCancellingPendingPayment] = useState(false);
  const paymentHelp = getPaymentHelp(paymentMethod);

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
    let lastForcedProviderCheckAt = 0;
    const startedAt = Date.now();

    // I keep all payment exits here so the spinner never runs beyond one minute.
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

      const remainingMs = MAX_POLL_DURATION_MS - (Date.now() - startedAt);
      pollTimeout = setTimeout(pollPaymentStatus, Math.max(0, Math.min(POLL_DELAY_MS, remainingMs)));
    };

    const getStatusUrl = (forceProviderCheck: boolean) => {
      const query = forceProviderCheck ? '?forceProviderCheck=true' : '';
      return `/api/payments/reference/${reference}${query}`;
    };

    const pollPaymentStatus = async () => {
      if (isStopped) {
        return;
      }

      const elapsedMs = Date.now() - startedAt;
      const shouldForceProviderCheck =
        pollCount === 0 ||
        elapsedMs >= MAX_POLL_DURATION_MS - POLL_DELAY_MS ||
        elapsedMs - lastForcedProviderCheckAt >= FORCE_PROVIDER_CHECK_MS;

      if (shouldForceProviderCheck) {
        lastForcedProviderCheckAt = elapsedMs;
      }

      try {
        const response = await api.get(getStatusUrl(shouldForceProviderCheck), {
          timeout: 10000,
          suppressErrorToast: true,
        } as any);
        const paymentData = response.data.data;

        setPaymentType(paymentData.paymentType ?? null);
        setPaymentMethod(paymentData.paymentMethod ?? null);

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

          setModalMode('failed');
          setModalTitle('Payment failed');
          setErrorMessage(
            paymentData.failureReason ||
              'Payment failed. No money was received. Please try again.'
          );
          setShowErrorModal(true);
          return;
        }

        if (!paymentData.providerReference && elapsedMs >= NOT_STARTED_GRACE_MS) {
          stopPollingWithModal(
            'notStarted',
            'Payment not started',
            'We could not confirm that the payment prompt started. Please go back and start the payment again.'
          );
          return;
        }

        if (elapsedMs >= MAX_POLL_DURATION_MS) {
          const help = getPaymentHelp(paymentData.paymentMethod);

          stopPollingWithModal(
            'pending',
            'Payment still pending',
            `We have not received confirmation yet. If you have not approved it, dial ${help.code}, confirm your ${help.methodLabel} payment, then tap Try again.`
          );
          return;
        }
      } catch (error: any) {
        const providerMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.userMessage;

        if (error?.response) {
          stopPollingWithModal(
            'pending',
            'Verification delayed',
            providerMessage ||
              'We could not verify this payment from the server right now. Please tap Try again before starting a new payment.'
          );
          return;
        }

        if (Date.now() - startedAt >= Math.min(15000, MAX_POLL_DURATION_MS)) {
          stopPollingWithModal(
            'connection',
            'Connection interrupted',
            'We could not verify the payment because the app could not reach the backend. If you approved it, tap Try again when your internet is stable.'
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

    if (modalMode === 'failed' || modalMode === 'notStarted') {
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

  const handleCancel = async () => {
    if (isCancellingPendingPayment) {
      return;
    }

    setShowErrorModal(false);

    // I save a reminder only when the provider may still complete the payment.
    if (modalMode === 'pending') {
      setIsCancellingPendingPayment(true);

      try {
        const response = await api.post(
          `/api/payments/${reference}/pending-reminder`,
          undefined,
          {
            timeout: 12000,
            suppressErrorToast: true,
          } as any
        );
        const payment = response.data?.data?.payment;

        if (payment?.status === 'successful') {
          navigation.replace('PaymentSuccessful', { reference });
          return;
        }

        if (payment?.status === 'failed') {
          setModalMode('failed');
          setModalTitle('Payment failed');
          setErrorMessage(
            payment.failureReason ||
              'Payment failed. No money was received. Please try again.'
          );
          setShowErrorModal(true);
          return;
        }

        showSuccessToast("We'll keep tracking this payment. Check notifications for updates.");
      } catch {
        showErrorToast('Unable to save this pending payment reminder right now.');
      } finally {
        setIsCancellingPendingPayment(false);
      }
    }

    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={[styles.container, isAndroid && styles.androidContainer]}>
      {/* Loading State */}
      <Text style={[styles.title, isAndroid && styles.androidTitle]}>
        Complete payment on{'\n'}your phone
      </Text>

      <SpinningLoader size={isAndroid ? 82 : 100} />

      <Text style={[styles.instruction, isAndroid && styles.androidInstruction]}>
        Dial <Text style={styles.code}>{paymentHelp.code}</Text> and confirm payment
      </Text>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isAndroid && styles.androidModalContent]}>
            {/* Error Icon */}
            <View style={[styles.errorIconContainer, isAndroid && styles.androidErrorIconContainer]}>
              <View
                style={[
                  styles.errorIconCircle,
                  isAndroid && styles.androidErrorIconCircle,
                  modalMode !== 'failed' && styles.pendingIconCircle,
                ]}
              >
                <Ionicons
                  name={modalMode === 'failed' ? 'close-circle-outline' : 'hourglass-outline'}
                  size={isAndroid ? 27 : 32}
                  color={modalMode === 'failed' ? '#DC2626' : colors.primary}
                />
                <View style={[styles.warningBadge, isAndroid && styles.androidWarningBadge]}>
                  <Ionicons name="warning" size={isAndroid ? 13 : 16} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Error Title */}
            <Text style={[styles.modalTitle, isAndroid && styles.androidModalTitle]}>
              {modalTitle}
            </Text>

            {/* Error Message */}
            <Text style={[styles.modalMessage, isAndroid && styles.androidModalMessage]}>
              {errorMessage || `Dial ${paymentHelp.code} and confirm payment within 1 minute of initiating payment`}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, isAndroid && styles.androidModalButton]}
                onPress={handleCancel}
                disabled={isCancellingPendingPayment}
              >
                {isCancellingPendingPayment ? (
                  <ActivityIndicator color="#DC2626" />
                ) : (
                  <Text
                    style={[styles.cancelButtonText, isAndroid && styles.androidModalButtonText]}
                    numberOfLines={1}
                  >
                    Cancel
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tryAgainButton, isAndroid && styles.androidModalButton]}
                onPress={handleRetry}
              >
                <Text
                  style={[styles.tryAgainButtonText, isAndroid && styles.androidModalButtonText]}
                  numberOfLines={1}
                >
                  {modalMode === 'failed' || modalMode === 'notStarted'
                    ? 'Start over'
                    : 'Try again'}
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,

  },
  androidContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 40,
  },
  androidTitle: {
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 44,
  },
  instruction: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginTop: 60,
  },
  androidInstruction: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 44,
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
  androidModalContent: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    maxWidth: 336,
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  androidErrorIconContainer: {
    marginBottom: 14,
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
  androidErrorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  androidWarningBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  androidModalTitle: {
    fontSize: 16.5,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  androidModalMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
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
  androidModalButton: {
    minHeight: 44,
    borderRadius: 18,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
  androidModalButtonText: {
    fontSize: 12.5,
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
