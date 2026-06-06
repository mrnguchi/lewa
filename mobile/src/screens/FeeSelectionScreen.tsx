/**
 * FeeSelectionScreen Component
 * 
 * Screen for selecting fee payment type (Complete or Half)
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast, showSuccessToast } from '../services/toast';
import {
  CURRENT_ACADEMIC_YEAR_LABEL,
  FULL_FEE_AMOUNT,
  HALF_FEE_AMOUNT,
} from '../constants/payment';


type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: {
    paymentType: 'fee' | 'subscription';
    feeInstallment?: 'full' | 'half' | null;
    amount: number
  };
};

type FeeSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FeeSelection'>;

const FeeSelectionScreen: React.FC = () => {
  const navigation = useNavigation<FeeSelectionScreenNavigationProp>();
  const { user } = useAuth();
  const isAndroid = Platform.OS === 'android';
  const hasCompletedFees = user?.fee_status === 'PAID';
  const hasPaidHalf = user?.fee_status === 'PARTIAL';
  const studentLevel = user?.level ?? 400;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (hasCompletedFees) {
      showSuccessToast("You've completed fees for this school year.");
      navigation.goBack();
    }
  }, [hasCompletedFees, navigation]);

  if (!fontsLoaded) {
    return null;
  }

  const handleFeeSelection = (feeInstallment: 'full' | 'half', amount: number) => {
    if (hasCompletedFees) {
      showSuccessToast("You've completed fees for this school year.");
      return;
    }

    if (hasPaidHalf && feeInstallment === 'full') {
      showErrorToast("You've already paid half. Please complete the remaining half payment.");
      return;
    }

    navigation.navigate('PaymentMethod', {
      paymentType: 'fee',
      feeInstallment,
      amount
    });
  };

  return (
    <View style={styles.container}>

    {/* Fixed Top Header */}
    <AppHeader title="Fee Selection" onBackPress={() => navigation.goBack()} />

    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, isAndroid && styles.androidScrollContent]}
      showsVerticalScrollIndicator={false}
    >
        {/* Fee Cards */}
        <View style={[styles.cardsContainer, isAndroid && styles.androidCardsContainer]}>
          {/* Complete Fee Payment Card */}
          <TouchableOpacity
            style={[
              styles.feeCard,
              isAndroid && styles.androidFeeCard,
              hasPaidHalf && styles.disabledFeeCard,
            ]}
            activeOpacity={0.85}
            disabled={hasPaidHalf || hasCompletedFees}
            onPress={() => handleFeeSelection('full', FULL_FEE_AMOUNT)}
          >
            <View style={[styles.cardHeader, isAndroid && styles.androidCardHeader]}>
              <View style={[styles.iconContainer, isAndroid && styles.androidIconContainer]}>
                <Ionicons name="wallet" size={isAndroid ? 26 : 32} color={colors.primary} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={[styles.cardTitle, isAndroid && styles.androidCardTitle]}>
                  Complete Fee Payment
                </Text>
                <Text style={[styles.cardYear, isAndroid && styles.androidCardYear]}>
                  {CURRENT_ACADEMIC_YEAR_LABEL}
                </Text>
              </View>
            </View>

            <View style={[styles.cardBody, isAndroid && styles.androidCardBody]}>
              <View style={styles.amountSection}>
                <Text style={[styles.amountLabel, isAndroid && styles.androidMetaLabel]}>
                  Amount
                </Text>
                <Text style={[styles.amountValue, isAndroid && styles.androidAmountValue]}>
                  {FULL_FEE_AMOUNT} <Text style={[styles.currency, isAndroid && styles.androidCurrency]}>XAF</Text>
                </Text>
              </View>

              <View style={styles.studentLvSection}>
                <Text style={[styles.studentLvLabel, isAndroid && styles.androidMetaLabel]}>
                  Student Lv
                </Text>
                <View style={[styles.studentLvValue, isAndroid && styles.androidStudentLvValue]}>
                  <Ionicons name="person" size={isAndroid ? 14 : 16} color={colors.gold} />
                  <Text style={[styles.studentLvText, isAndroid && styles.androidStudentLvText]}>
                    {studentLevel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.cardFooter, isAndroid && styles.androidCardFooter]}>
              <View style={styles.paymentSection}>
                <Text style={[styles.payableLabel, isAndroid && styles.androidMetaLabel]}>
                  Payable with
                </Text>
                <View style={styles.paymentOptions}>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>Orange</Text>
                  </View>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>MTN</Text>
                  </View>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>Bank</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.arrowButton,
                  isAndroid && styles.androidArrowButton,
                  hasPaidHalf && styles.arrowButtonDisabled,
                ]}
                onPress={() => handleFeeSelection('full', FULL_FEE_AMOUNT)}
                disabled={hasPaidHalf || hasCompletedFees}
              >
                <Ionicons name="arrow-forward" size={isAndroid ? 20 : 24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Half Fee Payment Card */}
          <TouchableOpacity
            style={[
              styles.feeCard,
              styles.feeCardWhite,
              isAndroid && styles.androidFeeCard,
              isAndroid && styles.androidFeeCardWhite,
            ]}
            activeOpacity={0.85}
            disabled={hasCompletedFees}
            onPress={() => handleFeeSelection('half', HALF_FEE_AMOUNT)}
          >
            <View style={[styles.cardHeader, isAndroid && styles.androidCardHeader]}>
              <View style={[styles.iconContainer, isAndroid && styles.androidIconContainer]}>
                <Ionicons name="card" size={isAndroid ? 26 : 32} color={colors.primary} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={[styles.cardTitleDark, isAndroid && styles.androidCardTitle]}>
                  Half Fee Payment
                </Text>
                <Text style={[styles.cardYearDark, isAndroid && styles.androidCardYear]}>
                  {CURRENT_ACADEMIC_YEAR_LABEL}
                </Text>
              </View>
            </View>

            <View style={[styles.cardBody, isAndroid && styles.androidCardBody]}>
              <View style={styles.amountSection}>
                <Text style={[styles.amountLabelDark, isAndroid && styles.androidMetaLabel]}>Amount</Text>
                <Text style={[styles.amountValue, isAndroid && styles.androidAmountValue]}>
                  {HALF_FEE_AMOUNT} <Text style={[styles.currencyDark, isAndroid && styles.androidCurrency]}>XAF</Text>
                </Text>
              </View>

              <View style={styles.studentLvSection}>
                <Text style={[styles.studentLvLabelDark, isAndroid && styles.androidMetaLabel]}>
                  Student Lv
                </Text>
                <View style={[styles.studentLvValue, isAndroid && styles.androidStudentLvValue]}>
                  <Ionicons name="person" size={isAndroid ? 14 : 16} color={colors.gold} />
                  <Text style={[styles.studentLvText, isAndroid && styles.androidStudentLvText]}>
                    {studentLevel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.cardFooter, isAndroid && styles.androidCardFooter]}>
              <View style={styles.paymentSection}>
                <Text style={[styles.payableLabelDark, isAndroid && styles.androidMetaLabel]}>
                  Payable with
                </Text>
                <View style={styles.paymentOptions}>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>Orange</Text>
                  </View>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>MTN</Text>
                  </View>
                  <View style={[styles.paymentChip, isAndroid && styles.androidPaymentChip]}>
                    <Text style={[styles.paymentChipText, isAndroid && styles.androidPaymentChipText]}>Bank</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.arrowButton, isAndroid && styles.androidArrowButton]}
                onPress={() => handleFeeSelection('half', HALF_FEE_AMOUNT)}
                disabled={hasCompletedFees}
              >
                <Ionicons name="arrow-forward" size={isAndroid ? 20 : 24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={[styles.bottomSpacer, isAndroid && styles.androidBottomSpacer]} />
      </ScrollView>

      
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  androidScrollContent: {
    justifyContent: 'center',
    paddingBottom: 18,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.background,
    marginTop: -10,
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Medium',
    color: colors.primary,
    textAlign: 'center',
  },
  cardsContainer: {
    padding: 20,
    gap: 20,
  },
  androidCardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    gap: 14,
  },
  bottomSpacer: {
    height: 40,
  },
  androidBottomSpacer: {
    height: 0,
  },
  feeCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: 16,
    padding: 20,
  },
  androidFeeCard: {
    borderRadius: 14,
    padding: 16,
  },
  disabledFeeCard: {
    opacity: 0.45,
  },
  feeCardWhite: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  androidFeeCardWhite: {
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  androidCardHeader: {
    gap: 10,
    marginBottom: 15,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 11,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
    marginBottom: 2,
  },
  androidCardTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  cardYear: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
  },
  androidCardYear: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  androidCardBody: {
    gap: 14,
    marginBottom: 15,
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
    marginBottom: 4,
  },
  androidMetaLabel: {
    fontSize: 10.5,
    marginBottom: 3,
  },
  amountValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  androidAmountValue: {
    fontSize: 21,
    lineHeight: 27,
  },
  currency: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
  },
  androidCurrency: {
    fontSize: 13,
  },
  studentLvSection: {
    alignItems: 'flex-end',
  },
  studentLvLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
    marginBottom: 4,
  },
  studentLvValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  androidStudentLvValue: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  studentLvText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  androidStudentLvText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  androidCardFooter: {
    gap: 10,
  },
  paymentSection: {
    flex: 1,
    gap: 8,
  },
  payableLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
    marginBottom: 4,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  paymentChip: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  androidPaymentChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  paymentChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  androidPaymentChipText: {
    fontSize: 10.5,
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidArrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  arrowButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  // Dark text styles for white card (bottom card)
  cardTitleDark: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardYearDark: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  amountLabelDark: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 4,
  },
  currencyDark: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  studentLvLabelDark: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 4,
  },
  payableLabelDark: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 4,
  },
});

export default FeeSelectionScreen;
