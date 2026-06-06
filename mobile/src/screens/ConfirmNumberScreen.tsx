/**
 * ConfirmNumberScreen Component
 *
 * Screen for confirming phone number for payment
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast, showSuccessToast } from '../services/toast';
import { CURRENT_ACADEMIC_YEAR } from '../constants/payment';

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: {
    paymentType: 'fee' | 'subscription';
    feeInstallment?: 'full' | 'half' | null;
    amount: number
  };
  ConfirmNumber: {
    paymentType: 'fee' | 'subscription';
    feeInstallment?: 'full' | 'half' | null;
    amount: number;
    paymentMethod: string
  };
  PaymentSummary: { reference: string };
};

type ConfirmNumberScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConfirmNumber'>;
type ConfirmNumberScreenRouteProp = RouteProp<RootStackParamList, 'ConfirmNumber'>;

const normalizeCameroonLocalPhone = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  const withoutCountryCode = digits.startsWith('237') ? digits.slice(3) : digits;

  return withoutCountryCode.slice(0, 9);
};

const getPaymentMethodLabel = (paymentMethod: string) => {
  if (paymentMethod === 'mtn') {
    return 'MTN Mobile Money';
  }

  if (paymentMethod === 'orange') {
    return 'Orange Money';
  }

  return paymentMethod;
};

const ConfirmNumberScreen: React.FC = () => {
  const navigation = useNavigation<ConfirmNumberScreenNavigationProp>();
  const route = useRoute<ConfirmNumberScreenRouteProp>();
  const { paymentType, feeInstallment, amount, paymentMethod } = route.params;
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();
  const androidBottomPadding = Math.max(insets.bottom + 18, 32);

  // Get user data from auth context
  const { user } = useAuth();

  // Store only digits internally (Cameroon numbers are 9 digits)
  // Extract phone number from user data (remove country code if present)
  const getUserPhoneDigits = () => {
    return normalizeCameroonLocalPhone(user?.phone_number);
  };

  const [phoneNumber, setPhoneNumber] = useState(getUserPhoneDigits());
  const [countryCode] = useState('+237');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    setPhoneNumber((currentPhoneNumber) => (
      currentPhoneNumber || normalizeCameroonLocalPhone(user?.phone_number)
    ));
  }, [user?.phone_number]);

  useEffect(() => {
    if (paymentType === 'fee' && user?.fee_status === 'PAID') {
      showSuccessToast("You've completed fees for this school year.");
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }

    if (paymentType === 'fee' && user?.fee_status === 'PARTIAL' && feeInstallment === 'full') {
      showErrorToast("You've already paid half. Please complete the remaining half payment.");
      navigation.navigate('FeeSelection');
    }
  }, [feeInstallment, navigation, paymentType, user?.fee_status]);

  // Validate Cameroon phone number (must be 9 digits starting with 6 or 7)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-7]\d{8}$/;
    return phoneRegex.test(phone);
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleNext = async () => {
    setErrorMessage('');

    if (paymentType === 'fee' && user?.fee_status === 'PAID') {
      showSuccessToast("You've completed fees for this school year.");
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }

    if (paymentType === 'fee' && user?.fee_status === 'PARTIAL' && feeInstallment === 'full') {
      showErrorToast("You've already paid half. Please complete the remaining half payment.");
      navigation.navigate('FeeSelection');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Invalid phone number (must be 9 digits starting with 6 or 7)');
      return;
    }

    setIsLoading(true);

    try {
      // Get student ID from user context
      if (!user?.id) {
        showErrorToast('Please log in again.');
        setIsLoading(false);
        return;
      }

      // Format phone number (add 237 prefix, remove any existing prefix)
      const formattedPhone = `237${normalizeCameroonLocalPhone(phoneNumber)}`;

      // Prepare payment data based on payment type
      // Database expects: 'fee' or 'subscription'
      const paymentData = paymentType === 'subscription'
        ? {
            studentId: user.id,
            paymentType: 'subscription',
            amount: amount,
            academicYear: CURRENT_ACADEMIC_YEAR,
            paymentMethod: paymentMethod,
            phoneNumber: formattedPhone,
          }
        : {
            studentId: user.id,
            paymentType: 'fee',
            amount: amount,
            academicYear: CURRENT_ACADEMIC_YEAR,
            paymentMethod: paymentMethod,
            phoneNumber: formattedPhone,
            feeInstallment: feeInstallment
          };

      // Call backend API to initiate payment
      const response = await api.post('/api/payments', paymentData);

      // Get reference from response
      const { reference } = response.data.data;

      setIsLoading(false);

      // Navigate to Payment Summary with reference
      navigation.navigate('PaymentSummary', { reference });

    } catch (error: any) {
      setIsLoading(false);

      if (!error?.userMessage && !error?.response) {
        showErrorToast('Failed to initiate payment. Please try again.');
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <AppHeader title="Confirm number" onBackPress={() => navigation.goBack()} />

        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isAndroid && styles.androidScrollContent,
              isAndroid && { paddingBottom: androidBottomPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.contentGroup, isAndroid && styles.androidContentGroup]}>
              <View style={[styles.heroCard, isAndroid && styles.androidHeroCard]}>
                <View style={[styles.iconCircle, isAndroid && styles.androidIconCircle]}>
                  <Ionicons name="call" size={isAndroid ? 25 : 30} color={colors.primary} />
                </View>

                <Text style={[styles.cardTitle, isAndroid && styles.androidCardTitle]}>
                  Payment number
                </Text>
                <Text style={[styles.instructionText, isAndroid && styles.androidInstructionText]}>
                  Confirm the mobile money number that will receive the payment prompt.
                </Text>

                <View style={[styles.paymentMeta, isAndroid && styles.androidPaymentMeta]}>
                  <View style={styles.paymentMetaItem}>
                    <Text style={[styles.metaLabel, isAndroid && styles.androidMetaLabel]}>Method</Text>
                    <Text style={[styles.metaValue, isAndroid && styles.androidMetaValue]}>
                      {getPaymentMethodLabel(paymentMethod)}
                    </Text>
                  </View>
                  <View style={styles.paymentMetaDivider} />
                  <View style={styles.paymentMetaItem}>
                    <Text style={[styles.metaLabel, isAndroid && styles.androidMetaLabel]}>Amount</Text>
                    <Text style={[styles.metaValue, isAndroid && styles.androidMetaValue]}>
                      {amount.toLocaleString()} XAF
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.formSection, isAndroid && styles.androidFormSection]}>
                <Text style={[styles.inputLabel, isAndroid && styles.androidInputLabel]}>
                  Mobile money number
                </Text>
                <View
                  style={[
                    styles.phoneInputContainer,
                    isAndroid && styles.androidPhoneInputContainer,
                    errorMessage && styles.phoneInputContainerError,
                  ]}
                >
                  <View style={[styles.countryCodeBox, isAndroid && styles.androidCountryCodeBox]}>
                    <Text style={[styles.countryCodeText, isAndroid && styles.androidCountryCodeText]}>
                      {countryCode}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, isAndroid && styles.androidPhoneInput]}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(normalizeCameroonLocalPhone(text));
                      setErrorMessage('');
                    }}
                    placeholder="677268983"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={9}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                  </View>
                ) : (
                  <Text style={[styles.helperText, isAndroid && styles.androidHelperText]}>
                    Use a 9-digit Cameroon number starting with 6 or 7.
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.nextButton,
                isAndroid && styles.androidNextButton,
                isLoading && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[styles.nextButtonText, isAndroid && styles.androidNextButtonText]}>
                  Continue
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    position: 'relative',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    left: 0,
    zIndex: 10,
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    textAlign: 'center',
  },
  keyboardArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 34,
  },
  androidScrollContent: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  contentGroup: {
    width: '100%',
  },
  // I center only the main content on Android, then leave the button pinned low.
  androidContentGroup: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 18,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  androidHeroCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 0,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  androidIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  androidCardTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  androidInstructionText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  paymentMeta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  androidPaymentMeta: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  paymentMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  paymentMetaDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.58)',
    marginBottom: 3,
  },
  androidMetaLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
    textAlign: 'center',
  },
  androidMetaValue: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  formSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  androidFormSection: {
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 0,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  androidInputLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  errorMessage: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
    lineHeight: 18,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    minHeight: 58,
  },
  androidPhoneInputContainer: {
    minHeight: 48,
    borderRadius: 13,
  },
  phoneInputContainerError: {
    borderColor: colors.error,
    backgroundColor: '#FFF7F7',
  },
  countryCodeBox: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  androidCountryCodeBox: {
    paddingHorizontal: 13,
  },
  countryCodeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  androidCountryCodeText: {
    fontSize: 12.5,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  androidPhoneInput: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 10,
    lineHeight: 18,
  },
  androidHelperText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
  },
  nextButton: {
    backgroundColor: colors.primary,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  androidNextButton: {
    minHeight: 48,
    borderRadius: 24,
    marginTop: 0,
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 1,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  androidNextButtonText: {
    fontSize: 14,
  },
});

export default ConfirmNumberScreen;
