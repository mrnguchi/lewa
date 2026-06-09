/**
 * PaymentSuccessfulScreen Component
 *
 * Screen displayed after successful payment with receipt details
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast } from '../services/toast';
import BackIconButton from '../components/BackIconButton';
import { resetToMainTab } from '../navigation/resetNavigation';

type RootStackParamList = {
  MainTabs: { screen: string };
  PaymentSuccessful: { reference: string };
};

type PaymentSuccessfulScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentSuccessful'>;
type PaymentSuccessfulScreenRouteProp = RouteProp<RootStackParamList, 'PaymentSuccessful'>;

const PaymentSuccessfulScreen: React.FC = () => {
  const navigation = useNavigation<PaymentSuccessfulScreenNavigationProp>();
  const route = useRoute<PaymentSuccessfulScreenRouteProp>();
  const { reference } = route.params;
  const { refreshUserData } = useAuth();
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // A completed payment should always leave the checkout flow behind.
  const handleBackHome = useCallback(async () => {
    try {
      await refreshUserData();
    } finally {
      resetToMainTab(navigation);
    }
  }, [navigation, refreshUserData]);

  // I make the Android system back button behave like the visible back button.
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        void handleBackHome();
        return true;
      });

      return () => backHandler.remove();
    }, [handleBackHome])
  );

  // Fetch receipt data from backend
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        const response = await api.get(`/api/payments/receipt/${reference}`);
        setReceiptData(response.data.data);
        setIsLoading(false);
      } catch {
        showErrorToast('Failed to load receipt details.');
        setIsLoading(false);
        // Still allow user to go back home
      }
    };

    fetchReceiptData();
  }, [reference]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontFamily: 'Poppins_400Regular', color: colors.textBody }}>
          Loading receipt...
        </Text>
      </View>
    );
  }

  if (!receiptData) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <BackIconButton
            style={styles.backButton}
            onPress={handleBackHome}
          />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: colors.textPrimary, textAlign: 'center' }}>
            Receipt not available
          </Text>
          <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textBody, textAlign: 'center', marginTop: 8 }}>
            Please check your payment history
          </Text>
        </View>
      </View>
    );
  }

  const amountPaid = Number(receiptData.amount || 0);
  const studentName = receiptData.student?.name || 'Student';
  const matricule = receiptData.student?.matricule || 'N/A';
  const faculty = receiptData.student?.faculty || 'N/A';
  const level = receiptData.student?.level || 'N/A';
  const paymentType = receiptData.paymentType;
  const isSubscription = paymentType === 'subscription';

  const dateOfPayment = new Date(receiptData.paidAt || receiptData.createdAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ';');
  const paymentTypeLabel = isSubscription ? 'Subscription' : 'Fee Payment';
  const paymentTypeValue = isSubscription
    ? 'Annual Subscription'
    : receiptData.feeInstallment === 'full'
      ? 'Complete Fee Payment'
      : 'Half Fee Payment';
  const academicYear = receiptData.academicYear || '2025/2026';
  const paymentMethod = receiptData.paymentMethod?.toLowerCase() || 'mtn';
  const phoneNumber = receiptData.phoneNumber || 'N/A';
  const receiptNumber = receiptData.receiptNumber || 'N/A';

  // I use the provider logo here so this screen matches saved receipt details.
  const getPaymentMethodLogo = () => {
    if (paymentMethod === 'orange') {
      return require('../../assets/orange-money.png');
    }

    return require('../../assets/momo.jpeg');
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          isAndroid && styles.androidHeader,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <BackIconButton
          style={[styles.backButton, isAndroid && styles.androidBackButton]}
          onPress={handleBackHome}
        />
      </View>

      <View style={[styles.mainContainer, isAndroid && styles.androidMainContainer]}>
        <View style={[styles.receiptIconContainer, isAndroid && styles.androidReceiptIconContainer]}>
          <Image
            source={require('../../assets/receipt-icon.png')}
            style={[styles.receiptIcon, isAndroid && styles.androidReceiptIcon]}
          />
        </View>

        <Text style={[styles.title, isAndroid && styles.androidTitle]}>
          Payment successful
        </Text>
        <Text style={[styles.subtitle, isAndroid && styles.androidSubtitle]}>
          {isSubscription ? 'Your subscription is now active' : 'Your fee status has been updated'}
        </Text>

        <View style={[styles.paymentInfoCard, isAndroid && styles.androidPaymentInfoCard]}>
          <Image
            source={getPaymentMethodLogo()}
            style={[styles.paymentMethodLogo, isAndroid && styles.androidPaymentMethodLogo]}
          />
          <View style={styles.paymentInfoCardRight}>
            <Text style={styles.paymentTypeLabel}>{paymentTypeLabel}</Text>
            <Text style={[styles.paymentTypeValue, isAndroid && styles.androidPaymentTypeValue]}>
              {paymentTypeValue}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, isAndroid && styles.androidSummaryCard]}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <Text style={[styles.summaryTitle, isAndroid && styles.androidSummaryTitle]}>
              Payment summary
            </Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Student name
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {studentName}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Matricule
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {matricule}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Level
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {level}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Faculty
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {faculty}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Academic year
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {academicYear}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Amount paid
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {amountPaid.toLocaleString()} FCFA
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Receipt number
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {receiptNumber}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Reference ID
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {reference}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Date of payment
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {dateOfPayment}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                Phone number
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {phoneNumber}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>
                {isSubscription ? 'Subscription type' : 'Fee type'}
              </Text>
              <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>
                {isSubscription
                  ? 'Annual Subscription'
                  : receiptData.feeInstallment === 'full'
                    ? 'Complete Fees Paid'
                    : 'Half Fees Paid'}
              </Text>
            </View>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, isAndroid && styles.androidDownloadButton]}
          onPress={() => console.log('Download receipt')}
        >
          <Image
            source={require('../../assets/download-icon.png')}
            style={styles.downloadIcon}
          />
          <Text style={[styles.downloadButtonText, isAndroid && styles.androidDownloadButtonText]}>
            Download receipt
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  androidHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
  },
  androidBackButton: {
    width: 38,
    height: 38,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  androidMainContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  receiptIconContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 24,
  },
  androidReceiptIconContainer: {
    marginTop: 0,
    marginBottom: 16,
  },
  receiptIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  androidReceiptIcon: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -25,
  },
  androidTitle: {
    fontSize: 20,
    marginTop: -16,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 32,
  },
  androidSubtitle: {
    fontSize: 12.5,
    marginBottom: 20,
  },
  paymentInfoCard: {
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.border1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  androidPaymentInfoCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  paymentMethodLogo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  androidPaymentMethodLogo: {
    width: 60,
    height: 60,
    marginRight: 10,
  },
  paymentInfoCardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentTypeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  paymentTypeValue: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    flexWrap: 'wrap',
    maxWidth: 260,
    marginTop: 8,
  },
  androidPaymentTypeValue: {
    fontSize: 14,
    maxWidth: 220,
    marginTop: 5,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
    height: 320,
  },
  androidSummaryCard: {
    height: 280,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  androidSummaryTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    flex: 1,
  },
  androidSummaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  androidSummaryValue: {
    fontSize: 12,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: 250,
    alignSelf: 'center',
  },
  androidDownloadButton: {
    width: 220,
    paddingVertical: 12,
    borderRadius: 24,
  },
  downloadIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: 'contain',
  },
  downloadButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  androidDownloadButtonText: {
    fontSize: 14,
  },
});

export default PaymentSuccessfulScreen;
