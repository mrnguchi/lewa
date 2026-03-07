/**
 * ReceiptsScreen Component
 * 
 * Screen for displaying payment receipts with tabs for Fee Payments and Resources
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';

// Mock receipt data
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

const mockReceipts: Receipt[] = [
  {
    id: '1',
    studentId: 'CT24A456',
    paymentType: 'fee_payment',
    amount: 25000,
    referenceId: 'CIFT873JS',
    studentName: 'Munoh Nguchi',
    level: 'Level 400',
    dateOfPayment: '15/10/2026; 04:56pm',
    faculty: 'College of Technology',
    paymentMethod: 'mtn',
    feeType: 'complete Fee Payment',
    feeDescription: 'Fee Payment - installment',
  },
  {
    id: '2',
    studentId: 'CT24A456',
    paymentType: 'fee_payment',
    amount: 25000,
    referenceId: 'CIFT456XY',
    studentName: 'Munoh Nguchi',
    level: 'Level 400',
    dateOfPayment: '10/09/2026; 02:30pm',
    faculty: 'College of Technology',
    paymentMethod: 'mtn',
    feeType: 'half Fee Payment',
    feeDescription: 'Fee Payment - installment',
  },
  {
    id: '3',
    studentId: 'CT24A456',
    paymentType: 'resource',
    amount: 500,
    referenceId: 'CIFT124XY',
    studentName: 'Munoh Nguchi',
    level: 'Level 400',
    dateOfPayment: '10/10/2026; 02:30pm',
    faculty: 'College of Technology',
    paymentMethod: 'mtn',
    resourceName: 'Past Questions - Mathematics',
    resourceDescription: 'Platform charges - past question',
  },
  {
    id: '4',
    studentId: 'CT24A456',
    paymentType: 'resource',
    amount: 500,
    referenceId: 'CIFT124XY',
    studentName: 'Munoh Nguchi',
    level: 'Level 400',
    dateOfPayment: '10/10/2026; 02:30pm',
    faculty: 'College of Technology',
    paymentMethod: 'mtn',
    resourceName: 'Past Questions - Mathematics',
    resourceDescription: 'Platform charges - past question',
  },
  
];

type RootStackParamList = {
  MainTabs: { screen: string };
  Receipts: undefined;
  ReceiptDetails: { receipt: Receipt };
};

type ReceiptsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Receipts'>;

const ReceiptsScreen: React.FC = () => {
  const navigation = useNavigation<ReceiptsScreenNavigationProp>();
  const [selectedTab, setSelectedTab] = useState<'fee_payment' | 'resource'>('fee_payment');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Filter receipts based on selected tab
  const filteredReceipts = mockReceipts.filter(receipt => receipt.paymentType === selectedTab);

  const handleDeleteReceipt = (receiptId: string) => {
    // TODO: Call backend API to delete receipt
    console.log('Delete receipt:', receiptId);
  };

  const handleReceiptPress = (receipt: Receipt) => {
    navigation.navigate('ReceiptDetails', { receipt });
  };

  return (
    <View style={styles.container}>
      {/* Header Top Section */}
        <AppHeader />

      <View style={styles.header}>
        {/* Back Button and Title */}
        <View style={styles.titleSection}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2933" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>My receipts</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'fee_payment' && styles.tabActive]}
            onPress={() => setSelectedTab('fee_payment')}
          >
            <Text style={[styles.tabText, selectedTab === 'fee_payment' && styles.tabTextActive]}>
              Fee Payment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'resource' && styles.tabActive]}
            onPress={() => setSelectedTab('resource')}
          >
            <Text style={[styles.tabText, selectedTab === 'resource' && styles.tabTextActive]}>
              Resources
            </Text>
          </TouchableOpacity>
        </View>

        {/* Receipt Cards */}
        <View style={styles.receiptsContainer}>
          {filteredReceipts.map((receipt) => (
            <TouchableOpacity
              key={receipt.id}
              style={styles.receiptCard}
              onPress={() => handleReceiptPress(receipt)}
              activeOpacity={0.7}
            >
              {/* Receipt Icon */}
              <Image
                source={require('../../assets/receipt-icon.png')}
                style={styles.receiptIcon}
              />

              {/* Receipt Content */}
              <View style={styles.receiptContent}>
                <Text style={styles.receiptStudentId}>{receipt.studentId}</Text>
                <Text style={styles.receiptDescription}>
                  {receipt.paymentType === 'fee_payment'
                    ? receipt.feeDescription
                    : receipt.resourceDescription}
                </Text>
                <Text style={styles.receiptAmount}>XAF {receipt.amount.toLocaleString()}</Text>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteReceipt(receipt.id)}
              >
                <Ionicons name="trash-outline" size={24} color={colors.textBody} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
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
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
   titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    position: 'relative',
  },
  pageTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Medium',
    color: colors.primary,
    textAlign: 'center',
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
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: colors.background,
  },
  tabActive: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  tabTextActive: {
    color: colors.white,
  },
  receiptsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  receiptIcon: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginRight: 16,
  },
  receiptContent: {
    flex: 1,
  },
  receiptStudentId: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  receiptDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 6,
  },
  receiptAmount: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  deleteButton: {
    padding: 8,
  },
});

export default ReceiptsScreen;

