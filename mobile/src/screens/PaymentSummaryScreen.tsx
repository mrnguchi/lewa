/**
 * PaymentSummaryScreen Component
 * 
 * Screen for displaying payment summary before confirmation
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  BackHandler,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { api } from '../services/api';
import { showErrorToast } from '../services/toast';


type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeInstallment: 'full' | 'half'; amount: number };
  ConfirmNumber: { feeInstallment: 'full' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { reference: string };
  PaymentProcessing: { reference: string };
};

type PaymentSummaryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentSummary'>;
type PaymentSummaryScreenRouteProp = RouteProp<RootStackParamList, 'PaymentSummary'>;

const formatXafAmount = (value: number | string) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString('en-US').replace(/,/g, ' ');
};

const formatPaymentMethodLabel = (method?: string | null) => {
  if (method === 'mtn') {
    return 'MTN Mobile Money';
  }

  if (method === 'orange') {
    return 'Orange Money';
  }

  return method || 'N/A';
};

const formatCameroonPhone = (phone?: string | null) => {
  const rawPhone = phone || '';
  const digits = rawPhone.replace(/\D/g, '');
  const localNumber = digits.startsWith('237') ? digits.slice(3) : digits;

  if (localNumber.length !== 9) {
    return rawPhone || 'N/A';
  }

  return `+237 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
};

const shouldCheckPaymentStatusAfterTriggerError = (error: any) => {
  const status = error?.response?.status;

  return (
    !error?.response ||
    error?.code === 'ECONNABORTED' ||
    status === 499 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
};

const PaymentSummaryScreen: React.FC = () => {
  const navigation = useNavigation<PaymentSummaryScreenNavigationProp>();
  const route = useRoute<PaymentSummaryScreenRouteProp>();
  const { reference } = route.params;
  const allowNavigationRef = useRef(false);

  // State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Fetch payment data from backend
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const response = await api.get(`/api/payments/reference/${reference}`);
        setPaymentData(response.data.data);
        setIsLoading(false);
      } catch {
        showErrorToast('Failed to load payment details.');
        setIsLoading(false);
        allowNavigationRef.current = true;
        navigation.goBack();
      }
    };

    fetchPaymentData();
  }, [navigation, reference]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowNavigationRef.current) {
        return;
      }

      event.preventDefault();
      setShowCancelModal(true);
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowCancelModal(true);
      return true;
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontFamily: 'Poppins_400Regular', color: colors.textBody }}>
          Loading payment details...
        </Text>
      </View>
    );
  }

  if (!paymentData) {
    return null;
  }

  // Extract data from payment response
  const amount = paymentData.amount;
  const paymentType = paymentData.paymentType;
  const feeInstallment = paymentData.feeInstallment;
  const paymentMethod = paymentData.paymentMethod;
  const phoneNumber = paymentData.phoneNumber;
  const userName = paymentData.student?.name || 'Student';
  const matricule = paymentData.student?.matricule || 'N/A';
  const feeTypeText = feeInstallment === 'full' ? 'Complete Fees' : 'Half Fees';
  const isSubscription = paymentType === 'subscription';

  // Handler for back button - triggers cancel modal
  const handleBackPress = () => {
    setShowCancelModal(true);
  };

  // Handler for closing modal without canceling
  const handleCloseModal = () => {
    if (isCancellingPayment) {
      return;
    }

    setShowCancelModal(false);
  };

  // Handler for confirming cancellation
  const handleConfirmCancel = async () => {
    setIsCancellingPayment(true);

    try {
      await api.delete(`/api/payments/${reference}`, {
        suppressErrorToast: true,
      } as any);
      setShowCancelModal(false);
      allowNavigationRef.current = true;
      navigation.goBack();
    } catch (error: any) {
      const message =
        error.response?.status === 409
          ? 'This payment has already started. Please check the payment status instead.'
          : error.userMessage || 'Unable to cancel this payment right now.';

      showErrorToast(message);
    } finally {
      setIsCancellingPayment(false);
    }
  };

  // Handler for confirming payment - navigate to processing screen
  const handleConfirm = async () => {
    if (isConfirmingPayment) {
      return;
    }

    setIsConfirmingPayment(true);

    try {
      await api.get('/health', {
        timeout: 6000,
        suppressErrorToast: true,
      } as any);

      await api.post(`/api/payments/${reference}/trigger`, undefined, {
        timeout: 45000,
        suppressErrorToast: true,
      } as any);

      allowNavigationRef.current = true;
      navigation.navigate('PaymentProcessing', { reference });
    } catch (error: any) {
      if (shouldCheckPaymentStatusAfterTriggerError(error)) {
        showErrorToast(
          'We could not confirm whether the payment prompt started. Checking the payment status now.'
        );
        allowNavigationRef.current = true;
        navigation.navigate('PaymentProcessing', { reference });
        return;
      }

      showErrorToast(
        error.userMessage || 'Unable to start payment. Please try again.'
      );
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
      <View style={styles.container}>
        
        <AppHeader />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        {/* Header */}
        <View style={styles.header}>
          

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Amount and Status */}
        <View style={styles.paymentHeroCard}>
          <View style={styles.paymentHeroTopRow}>
            <View style={styles.paymentHeroTitleBlock}>
              <Text style={styles.paymentHeroEyebrow}>
                {isSubscription ? 'Subscription checkout' : 'Fee checkout'}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatXafAmount(amount)}
            </Text>
            <Text style={styles.currency}>XAF</Text>
          </View>

          <View style={styles.paymentHeroFooter}>
            <View style={styles.paymentHeroMiniItem}>
              <Text style={styles.paymentHeroMiniLabel}>Payment type</Text>
              <Text style={styles.paymentHeroMiniValue} numberOfLines={1}>
                {isSubscription ? 'Subscription' : 'Fees'}
              </Text>
            </View>
            <View style={styles.paymentHeroMiniDivider} />
            <View style={styles.paymentHeroMiniItem}>
              <Text style={styles.paymentHeroMiniLabel}>Status</Text>
              <Text style={styles.paymentHeroMiniValue} numberOfLines={1}>
                Awaiting confirmation
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Payment details</Text>
              <Text style={styles.summarySubtitle}>Confirm every detail carefully</Text>
            </View>
            <View style={styles.summaryIcon}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
          </View>

          {/* Summary Items */}
          <View style={styles.summaryItems}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Name</Text>
              <Text style={styles.summaryValue}>{userName}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Matricule</Text>
              <Text style={styles.summaryValue}>{matricule}</Text>
            </View>

            {/* Show fee type only for fee payments */}
            {!isSubscription && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee type</Text>
                <Text style={styles.summaryValue}>{feeTypeText}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment method</Text>
              <Text style={styles.summaryValue}>{formatPaymentMethodLabel(paymentMethod)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone number</Text>
              <Text style={styles.summaryValue}>{formatCameroonPhone(phoneNumber)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>{formatXafAmount(amount)} XAF</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reference</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{reference}</Text>
            </View>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, isConfirmingPayment && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isConfirmingPayment}
        >
          <Text style={styles.confirmButtonText}>Confirm and pay</Text>
          <View style={styles.confirmIconContainer}>
            {isConfirmingPayment ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons name="arrow-forward" size={24} color={colors.white} />
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Icon */}
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={60} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Cancel payment?</Text>

            {/* Message */}
            <Text style={styles.modalMessage}>
              This will delete the initialized payment and take you back.
            </Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonNo, isCancellingPayment && styles.modalButtonDisabled]}
                onPress={handleCloseModal}
                disabled={isCancellingPayment}
              >
                <Text style={styles.modalButtonNoText}>No, Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonYes, isCancellingPayment && styles.modalButtonDisabled]}
                onPress={handleConfirmCancel}
                disabled={isCancellingPayment}
              >
                {isCancellingPayment ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonYesText}>Yes, Cancel</Text>
                )}
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
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
  },
  paymentHeroCard: {
    backgroundColor: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 22,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  paymentHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  paymentHeroTitleBlock: {
    flex: 1,
  },
  paymentHeroEyebrow: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.58)',
    marginBottom: 4,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  amountValue: {
    fontSize: 38,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
    letterSpacing: 0,
  },
  currency: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#F59E0B',
  },
  paymentHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  paymentHeroMiniItem: {
    flex: 1,
  },
  paymentHeroMiniDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  paymentHeroMiniLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.52)',
    marginBottom: 3,
  },
  paymentHeroMiniValue: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  summarySubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 2,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryItems: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    flexShrink: 0,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  confirmButton: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.75,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  confirmIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonNo: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalButtonNoText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  modalButtonYes: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalButtonDisabled: {
    opacity: 0.65,
  },
  modalButtonYesText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});

export default PaymentSummaryScreen;
