/**
 * ReceiptDetailsScreen Component
 * 
 * Screen for displaying detailed receipt information
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

interface Receipt {
  id: string;
  studentId: string;
  paymentType: 'fee_payment' | 'resource';
  amount: number;
  referenceId: string;
  studentName: string;
  level: string;
  dateOfPayment: string;
  faculty: string;
  paymentMethod: 'mtn' | 'orange' | 'bank';
  feeType?: 'complete Fee Payment' | 'half Fee Payment';
  feeDescription?: string;
  resourceName?: string;
  resourceDescription?: string;
}

type RootStackParamList = {
  Receipts: undefined;
  ReceiptDetails: { receipt: Receipt };
};

type ReceiptDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReceiptDetails'>;
type ReceiptDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ReceiptDetails'>;

const ReceiptDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ReceiptDetailsScreenNavigationProp>();
  const route = useRoute<ReceiptDetailsScreenRouteProp>();
  const { receipt } = route.params;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Get payment method logo
  const getPaymentMethodLogo = () => {
    switch (receipt.paymentMethod) {
      case 'mtn':
        return require('../../assets/momo.jpeg');
      case 'orange':
        return require('../../assets/orange-money.png');
      default:
        return require('../../assets/momo.jpeg');
    }
  };

  // Get payment type label
  const paymentTypeLabel = receipt.paymentType === 'fee_payment' ? 'Fee Payment' : 'Resources';
  
  // Get payment type value
  const paymentTypeValue = receipt.paymentType === 'fee_payment'
    ? receipt.feeType === 'complete Fee Payment' ? 'Complete Fee Payment' : 'Half Fee Payment'
    : receipt.resourceName;

  const handleDownloadReceipt = () => {
    // TODO: Implement download receipt functionality
    console.log('Download receipt:', receipt.id);
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* main container */}
      <View style={styles.mainContainer}>
        {/* Receipt Icon */}
        <View style={styles.receiptIconContainer}>
          <Image
            source={require('../../assets/receipt-icon.png')}
            style={styles.receiptIcon}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Payment receipt</Text>
        <Text style={styles.subtitle}>
          {receipt.paymentType === 'fee_payment' 
            ? 'Your fee status will be updated' 
            : 'Your resource is now available'}
        </Text>

        {/* Payment Info Card */}
        <View style={styles.paymentInfoCard}>
          <View style={styles.paymentMethodColumn}>
            <Image source={getPaymentMethodLogo()} style={styles.paymentMethodLogo} />  
          </View>

          <View style={styles.paymentInfoCardRight}>
            <Text style={styles.paymentTypeLabel}>{paymentTypeLabel}</Text>
            <Text style={styles.paymentTypeValue}>{paymentTypeValue}</Text>
          </View>

          
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <Text style={styles.summaryTitle}>Payment summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Student name</Text>
            <Text style={styles.summaryValue}>{receipt.studentName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Matricule</Text>
            <Text style={styles.summaryValue}>{receipt.studentId}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Level</Text>
            <Text style={styles.summaryValue}>{receipt.level}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Faculty</Text>
            <Text style={styles.summaryValue}>{receipt.faculty}</Text>
          </View>


          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.summaryValue}>{receipt.amount.toLocaleString()} FCFA</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reference ID</Text>
            <Text style={styles.summaryValue}>{receipt.referenceId}</Text>
          </View>

  

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date of Payment</Text>
            <Text style={styles.summaryValue}>{receipt.dateOfPayment}</Text>
          </View>

          {/* Conditional row based on payment type */}
          {receipt.paymentType === 'fee_payment' ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee Type</Text>
              <Text style={styles.summaryValue}>
                {receipt.feeType === 'complete Fee Payment' ? 'Complete Fees Paid' : 'Half Fees Paid'}
              </Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Resource</Text>
              <Text style={styles.summaryValue}>{receipt.resourceName}</Text>
            </View>
          )}

          </ScrollView>
        </View>

        {/* Download Button */}
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadReceipt}>
          <Image
              source={require('../../assets/download-icon.png')}
              style={styles.downloadIcon}
            />
          <Text style={styles.downloadButtonText}>Download receipt</Text>
          {/* <Ionicons name="download-outline" size={20} color={colors.white} /> */}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
     
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,

  },
  scrollView: {
    flex: 1,
  },
  
  receiptIconContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 24,
  },
  receiptIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -25,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 32,
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
  paymentInfoCardRight: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  paymentMethodLogo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  // paymentMethodLabel: {
  //   fontSize: 16,
  //   fontFamily: 'Poppins_600SemiBold',
  //   color: colors.textPrimary,
  // },
  paymentMethodColumn:{
    flexDirection: 'column',
    
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
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
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
  downloadButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  downloadIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: 'contain',
  },
});

export default ReceiptDetailsScreen;

