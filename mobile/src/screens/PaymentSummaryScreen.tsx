/**
 * PaymentSummaryScreen Component
 * 
 * Screen for displaying payment summary before confirmation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';


type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeType: 'complete' | 'half'; amount: number };
  ConfirmNumber: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
  PaymentProcessing: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
};

type PaymentSummaryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentSummary'>;
type PaymentSummaryScreenRouteProp = RouteProp<RootStackParamList, 'PaymentSummary'>;

const PaymentSummaryScreen: React.FC = () => {
  const navigation = useNavigation<PaymentSummaryScreenNavigationProp>();
  const route = useRoute<PaymentSummaryScreenRouteProp>();
  const { amount, feeType, paymentMethod, phoneNumber } = route.params;

  // State
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Mock user data
  const userName = 'Munoh Nguchi';
  const matricule = 'CT24A456';
  const paymentReference = `CIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const feeTypeText = feeType === 'complete' ? 'Complete Fees' : 'Half Fees';

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Handler for back button - triggers cancel modal
  const handleBackPress = () => {
    setShowCancelModal(true);
  };

  // Handler for closing modal without canceling
  const handleCloseModal = () => {
    setShowCancelModal(false);
  };

  // Handler for confirming cancellation
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    navigation.goBack(); // Navigate back (no DB deletion needed)
  };

  // Handler for confirming payment - creates payment record in DB
  const handleConfirm = async () => {
    // TODO: Call backend API to create payment record
    // const paymentData = {
    //   feeType,
    //   amount,
    //   paymentMethod,
    //   phoneNumber,
    //   status: 'initialized',
    //   createdAt: new Date().toISOString()
    // };
    // const response = await api.createPayment(paymentData);
    // const paymentId = response.paymentId;

    // Navigate to processing screen
    // In production, pass the paymentId from the API response
    navigation.navigate('PaymentProcessing', {
      feeType,
      amount,
      paymentMethod,
      phoneNumber
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
        <View style={styles.amountContainer}>
          <View style={styles.amountSection}>
            <Text style={styles.amountValue}>{amount.toLocaleString()}</Text>
            <Text style={styles.currency}>XAF</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>

        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Payment summary</Text>
            <TouchableOpacity style={styles.copyButton}>
              <Ionicons name="list" size={20} color={colors.primary} />
            </TouchableOpacity>
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

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee type</Text>
              <Text style={styles.summaryValue}>{feeTypeText}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reference</Text>
              <Text style={styles.summaryValue}>{paymentReference}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment method</Text>
              <Text style={styles.summaryValue}>{paymentMethod}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone number</Text>
              <Text style={styles.summaryValue}>{phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm and pay</Text>
          <View style={styles.confirmIconContainer}>
            <Ionicons name="arrow-forward" size={24} color={colors.white} />
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
            <Text style={styles.modalTitle}>Cancel Payment?</Text>

            {/* Message */}
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this payment?
            </Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonNo}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalButtonNoText}>No, Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonYes}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.modalButtonYesText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  headerTop: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,

  },
  translationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 30,
    overflow: 'hidden',
  },
  profileIcon: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color:'#da1a23e8',
  },
  amountContainer: {
    backgroundColor: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 30,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amountValue: {
    fontSize: 40,
    fontFamily: 'Poppins_700SemiBold',
    color: colors.white,
  },
  currency: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#F59E0B',
  },
  statusBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#F59E0B',
  },
  summaryCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryItems: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
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
  modalButtonYesText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});

export default PaymentSummaryScreen;

