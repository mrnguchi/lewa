/**
 * PaymentSuccessfulScreen Component
 *
 * Screen displayed after successful payment with receipt details
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';

type RootStackParamList = {
  MainTabs: { screen: string };
  PaymentSuccessful: { referenceId: string };
};

type PaymentSuccessfulScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentSuccessful'>;
type PaymentSuccessfulScreenRouteProp = RouteProp<RootStackParamList, 'PaymentSuccessful'>;

const PaymentSuccessfulScreen: React.FC = () => {
  const navigation = useNavigation<PaymentSuccessfulScreenNavigationProp>();
  const route = useRoute<PaymentSuccessfulScreenRouteProp>();
  const { referenceId } = route.params;

  // Mock data
  const amountPaid = 50000;
  const studentName = 'Munoh Nguchi';
  const dateOfPayment = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ';');
  const faculty = 'College of Technology';
  const feeType = 'Tuition Fees';
  const academicYear = '2026/2027';
  const paymentMethod = 'MoMo';
  const paymentMethodLogo = require('../../assets/momo.jpeg');
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={60} color={colors.white} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.subtitle}>Your fee status will be updated</Text>

        {/* Fee Type Card */}
        <View style={styles.feeCard}>
          <View style={styles.paymentIconContainer}>
            <Image
              source={paymentMethodLogo}
              style={styles.paymentIcon}
            />
            {/* <Text style={styles.paymentMethodText}>{paymentMethod}</Text> */}
          </View>
          <View style={styles.feeInfo}>
            <Text style={styles.feeTypeText}>{feeType}</Text>
            <Text style={styles.feeStatus}>{feeType.includes('Half') ? 'Half Payment' : 'Complete'}</Text>
            <Text style={styles.academicYear}>{academicYear}</Text>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reference ID</Text>
            <Text style={styles.summaryValue}>{referenceId}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.summaryValue}>{amountPaid.toLocaleString()} FCFA</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Student name</Text>
            <Text style={styles.summaryValue}>{studentName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date of Payment</Text>
            <Text style={styles.summaryValue}>{dateOfPayment}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Faculty</Text>
            <Text style={styles.summaryValue}>{faculty}</Text>
          </View>
        </View>

        {/* Download Receipt Button */}
        <TouchableOpacity style={styles.downloadButton} onPress={() => console.log('Download receipt')}>
          <Image
            source={require('../../assets/download-icon.png')}
            style={styles.downloadIcon}
          />
          <Text style={styles.downloadButtonText}>Download receipt</Text>
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
  successIconContainer: {
    marginBottom: 32,
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
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 32,
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
  paymentIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
  feeStatus: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  academicYear: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
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
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 20,
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
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
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
});

export default PaymentSuccessfulScreen;

