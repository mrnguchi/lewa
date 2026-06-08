/**
 * ReceiptsScreen Component
 *
 * Screen for displaying payment receipts with tabs for Fee Payments and Subscriptions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { api } from '../services/api';

// Receipt data interface
interface Receipt {
  id: string;
  receiptNumber: string;
  amount: string;
  receiptType: 'school_fee' | 'subscription';
  paymentType: 'fee' | 'subscription';
  academicYear: string;
  issuedAt: string;
  paymentReference: string;
  paymentMethod: 'mtn' | 'orange';
  phoneNumber: string;
  feeInstallment: 'full' | 'half' | null;
  paidAt: string;
  student: {
    name: string;
    matricule: string;
    faculty: string;
    level: string;
  };
}

type RootStackParamList = {
  MainTabs: { screen: string };
  Receipts: undefined;
  ReceiptDetails: { receipt: Receipt };
};

type ReceiptsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Receipts'>;

const getReceiptTitle = (receipt: Receipt) => {
  if (receipt.receiptType === 'subscription') {
    return 'Subscription Payment';
  }

  return receipt.feeInstallment === 'half' ? 'Half Fee Payment' : 'Complete Fee Payment';
};

const getTransactionType = (receipt: Receipt) => {
  if (receipt.receiptType === 'subscription') {
    return 'Subscription';
  }

  return receipt.feeInstallment === 'half' ? 'Half Fee Payment' : 'Complete Fee Payment';
};

const formatReceiptDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatReceiptAmount = (amount: string) => {
  const numericAmount = Number.parseFloat(amount);

  if (Number.isNaN(numericAmount)) {
    return '+0 XAF';
  }

  return `+${numericAmount.toLocaleString('en-US').replace(/,/g, ' ')} XAF`;
};

const ReceiptsScreen: React.FC = () => {
  const navigation = useNavigation<ReceiptsScreenNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const [selectedTab, setSelectedTab] = useState<'school_fee' | 'subscription'>('school_fee');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Fetch receipts on component mount
  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/receipts/my');

      if (response.data.success) {
        setReceipts(response.data.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  // Filter receipts based on selected tab
  const filteredReceipts = receipts.filter(receipt => receipt.receiptType === selectedTab);

  const handleReceiptPress = (receipt: Receipt) => {
    navigation.navigate('ReceiptDetails', { receipt });
  };

  return (
    <View style={styles.container}>
      {/* Header Top Section */}
      <AppHeader title="My receipts" onBackPress={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isAndroid && styles.scrollContentAndroid,
        ]}
      >
        

        {/* Tabs */}
        <View style={[styles.tabsContainer, isAndroid && styles.tabsContainerAndroid]}>
          <TouchableOpacity
            style={[
              styles.tab,
              isAndroid && styles.tabAndroid,
              selectedTab === 'school_fee' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('school_fee')}
          >
            <Text
              style={[
                styles.tabText,
                isAndroid && styles.tabTextAndroid,
                selectedTab === 'school_fee' && styles.tabTextActive,
              ]}
            >
              Fee Payment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              isAndroid && styles.tabAndroid,
              selectedTab === 'subscription' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('subscription')}
          >
            <Text
              style={[
                styles.tabText,
                isAndroid && styles.tabTextAndroid,
                selectedTab === 'subscription' && styles.tabTextActive,
              ]}
            >
              Subscription
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading receipts...</Text>
          </View>
        ) : filteredReceipts.length === 0 ? (
          /* Empty State */
          <View style={styles.centerContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textBody} />
            <Text style={styles.emptyText}>No payments made yet</Text>
          </View>
        ) : (
          /* Receipt Cards */
          <View
            style={[
              styles.receiptsContainer,
              isAndroid && styles.receiptsContainerAndroid,
            ]}
          >
            {filteredReceipts.map((receipt) => (
              <TouchableOpacity
                key={receipt.id}
                style={[styles.receiptCard, isAndroid && styles.receiptCardAndroid]}
                onPress={() => handleReceiptPress(receipt)}
                activeOpacity={0.7}
              >
                <View style={styles.receiptContent}>
                  <Text
                    style={[styles.receiptTitle, isAndroid && styles.receiptTitleAndroid]}
                    numberOfLines={1}
                  >
                    {getReceiptTitle(receipt)}
                  </Text>
                  <Text style={styles.receiptDate}>{formatReceiptDate(receipt.paidAt || receipt.issuedAt)}</Text>
                  <Text style={styles.receiptDescription} numberOfLines={1}>
                    Transaction type: {getTransactionType(receipt)}
                  </Text>
                </View>
                <Text
                  style={[styles.receiptAmount, isAndroid && styles.receiptAmountAndroid]}
                >
                  {formatReceiptAmount(receipt.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
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
    paddingBottom: 40,
  },
  scrollContentAndroid: {
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.background,
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
  // Android receipt controls are kept compact so more records stay visible.
  tabsContainerAndroid: {
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: colors.background,
  },
  tabAndroid: {
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  tabActive: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  tabTextAndroid: {
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  receiptsContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  receiptsContainerAndroid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    minHeight: 96,
  },
  receiptCardAndroid: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 13,
    minHeight: 80,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  receiptContent: {
    flex: 1,
    paddingRight: 12,
  },
  receiptTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  receiptTitleAndroid: {
    fontSize: 14,
  },
  receiptDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#5F6673',
    marginBottom: 5,
  },
  receiptDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  receiptAmount: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.success,
    textAlign: 'right',
    paddingTop: 2,
  },
  receiptAmountAndroid: {
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ReceiptsScreen;
