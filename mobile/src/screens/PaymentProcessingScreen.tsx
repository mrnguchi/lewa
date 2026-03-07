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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeType: 'complete' | 'half'; amount: number };
  ConfirmNumber: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
  PaymentProcessing: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
  PaymentSuccessful: { referenceId: string };
};

type PaymentProcessingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentProcessing'>;
type PaymentProcessingScreenRouteProp = RouteProp<RootStackParamList, 'PaymentProcessing'>;

const PaymentProcessingScreen: React.FC = () => {
  const navigation = useNavigation<PaymentProcessingScreenNavigationProp>();
  const route = useRoute<PaymentProcessingScreenRouteProp>();
  const { feeType, amount, paymentMethod, phoneNumber } = route.params;

  const [showErrorModal, setShowErrorModal] = useState(false);
  const paymentCode = '*126#';

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    // Simulate payment processing - navigate to success after 5 seconds
    const successTimer = setTimeout(() => {
      const referenceId = `CIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      navigation.replace('PaymentSuccessful', { referenceId });
    }, 5000);

    return () => clearTimeout(successTimer);
  }, [navigation]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRetry = () => {
    setShowErrorModal(false);
    navigation.goBack(); // Go back to PaymentSummary
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
              <View style={styles.errorIconCircle}>
                <Ionicons name="hourglass-outline" size={32} color="#DC2626" />
                <View style={styles.warningBadge}>
                  <Ionicons name="warning" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Error Title */}
            <Text style={styles.modalTitle}>Payment session has expired</Text>

            {/* Error Message */}
            <Text style={styles.modalMessage}>
              Dial {paymentCode} and confirm payment within 1 mins of initiating payment
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tryAgainButton} onPress={handleRetry}>
                <Text style={styles.tryAgainButtonText}>Try again</Text>
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
    padding: 32,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.error,
  },
  tryAgainButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default PaymentProcessingScreen;

