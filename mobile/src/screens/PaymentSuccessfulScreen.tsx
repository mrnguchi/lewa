/**
 * PaymentSuccessfulScreen Component
 *
 * Screen displayed after successful payment with receipt details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast } from '../services/toast';
import BackIconButton from '../components/BackIconButton';

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

  const [isLoading, setIsLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Fetch receipt data from backend
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        console.log(`Fetching receipt for reference: ${reference}`);
        const response = await api.get(`/api/payments/receipt/${reference}`);
        console.log('Receipt data fetched:', response.data);
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
        <View style={styles.header}>
          <BackIconButton
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
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

  // Extract data from receipt (backend returns formatted data)
  console.log('📄 Receipt data structure:', JSON.stringify(receiptData, null, 2));

  const amountPaid = receiptData.amount || 0;
  const studentName = receiptData.student?.name || 'Student';
  const matricule = receiptData.student?.matricule || 'N/A';
  const faculty = receiptData.student?.faculty || 'N/A';
  const level = receiptData.student?.level || 'N/A';
  const paymentType = receiptData.paymentType;
  const isSubscription = paymentType === 'subscription';

  console.log('💰 Amount paid:', amountPaid);
  const dateOfPayment = new Date(receiptData.paidAt || receiptData.createdAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ';');
  const feeType = isSubscription ? 'Subscription' : 'School Fees';
  const academicYear = receiptData.academicYear || '2025/2026';
  const paymentMethod = receiptData.paymentMethod?.toUpperCase() || 'MOMO';
  const phoneNumber = receiptData.phoneNumber || 'N/A';
  const feeInstallment = receiptData.feeInstallment === 'full' ? 'Complete Fees' : 'Half Fees';

  // Handle back to home with user data refresh
  const handleBackHome = async () => {
    console.log(' Refreshing user data before going home...');
    await refreshUserData();
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={[styles.header, isAndroid && styles.androidHeader]}>
        <BackIconButton
          style={[styles.backButton, isAndroid && styles.androidBackButton]}
          onPress={handleBackHome}
        />

      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isAndroid && styles.androidScrollContent]}
      >
        {/* Success Icon */}
        <View style={[styles.successIconContainer, isAndroid && styles.androidSuccessIconContainer]}>
          <View style={[styles.successIconCircle, isAndroid && styles.androidSuccessIconCircle]}>
            <Ionicons name="checkmark" size={isAndroid ? 48 : 60} color={colors.white} />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, isAndroid && styles.androidTitle]}>
          Payment successful
        </Text>
        <Text style={[styles.subtitle, isAndroid && styles.androidSubtitle]}>
          {isSubscription ? 'Your subscription is now active' : 'Your fee status will be updated'}
        </Text>

        {/* Fee Type Card */}
        <View style={[styles.feeCard, isAndroid && styles.androidFeeCard]}>
          <View style={[styles.paymentIconContainer, isAndroid && styles.androidPaymentIconContainer]}>
            <Ionicons
              name={isSubscription ? "calendar-outline" : "card-outline"}
              size={isAndroid ? 26 : 32}
              color={colors.primary}
            />
          </View>
          <View style={styles.feeInfo}>
            <Text style={[styles.feeTypeText, isAndroid && styles.androidFeeTypeText]}>{feeType}</Text>
            {!isSubscription && (
              <Text style={[styles.feeStatus, isAndroid && styles.androidFeeStatus]}>
                {feeInstallment}
              </Text>
            )}
            {!isSubscription && (
              <Text style={[styles.academicYear, isAndroid && styles.androidAcademicYear]}>
                {academicYear}
              </Text>
            )}
            {isSubscription && (
              <Text style={[styles.feeStatus, isAndroid && styles.androidFeeStatus]}>
                1 Year Access
              </Text>
            )}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={[styles.summaryCard, isAndroid && styles.androidSummaryCard]}>
          <Text style={[styles.summaryTitle, isAndroid && styles.androidSummaryTitle]}>
            Payment summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Name</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{studentName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Matricule</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{matricule}</Text>
          </View>

          {/* Show faculty and level only for fee payments */}
          {!isSubscription && (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Faculty</Text>
                <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{faculty}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Level</Text>
                <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{level}</Text>
              </View>
            </>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Payment method</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{paymentMethod}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Phone number</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{phoneNumber}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Amount</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{amountPaid.toLocaleString()} XAF</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Reference</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{reference}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isAndroid && styles.androidSummaryLabel]}>Date</Text>
            <Text style={[styles.summaryValue, isAndroid && styles.androidSummaryValue]}>{dateOfPayment}</Text>
          </View>
        </View>

        {/* Download Receipt Button */}
        <TouchableOpacity
          style={[styles.downloadButton, isAndroid && styles.androidDownloadButton]}
          onPress={() => console.log('Download receipt')}
        >
          <Ionicons
            name="download-outline"
            size={isAndroid ? 18 : 20}
            color={colors.white}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.downloadButtonText, isAndroid && styles.androidDownloadButtonText]}>
            Download receipt
          </Text>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    
  },
  androidHeader: {
    paddingTop: 52,
    paddingBottom: 4,
  },
  backButton: {
    justifyContent: 'flex-start',
    width: 44,
    height: 44,
    paddingHorizontal: 8,
    flex:1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,

  },
  androidBackButton: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    flex: 0,
    gap: 0,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
    marginLeft: 8,
    
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  androidScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  successIconContainer: {
    marginBottom: 32,
  },
  androidSuccessIconContainer: {
    marginBottom: 22,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  androidSuccessIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  androidTitle: {
    fontSize: 23,
    lineHeight: 30,
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
    lineHeight: 19,
    marginBottom: 24,
  },
  feeCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 8,
    // elevation: 3,
    borderWidth: 0.5,
    borderColor: colors.border1,
  },
  androidFeeCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  paymentIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  androidPaymentIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 11,
    marginRight: 13,
  },
  paymentIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 10,
  },
  paymentMethodText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  feeInfo: {
    flex: 1,
  },
  feeTypeText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  androidFeeTypeText: {
    fontSize: 14,
    lineHeight: 19,
  },
  feeStatus: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  androidFeeStatus: {
    fontSize: 12,
    lineHeight: 17,
  },
  academicYear: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  androidAcademicYear: {
    fontSize: 11,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  androidSummaryCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 0,
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
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  androidSummaryValue: {
    fontSize: 12,
    lineHeight: 17,
  },
  downloadButton: {
    width: '80%',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  androidDownloadButton: {
    width: '82%',
    paddingVertical: 14,
    borderRadius: 24,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
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
    fontSize: 13,
  },
});

export default PaymentSuccessfulScreen;
