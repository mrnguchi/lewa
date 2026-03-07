/**
 * PaymentMethodScreen Component
 * 
 * Screen for selecting payment method with carousel of payment options
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 80;
const CARD_SPACING = 20;

interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  logo: any;
  lewaCharge: number;
}

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeType: 'complete' | 'half'; amount: number };
  ConfirmNumber: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
  PaymentProcessing: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
  PaymentSuccessful: { referenceId: string };
};

type PaymentMethodScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaymentMethod'>;
type PaymentMethodScreenRouteProp = RouteProp<RootStackParamList, 'PaymentMethod'>;

// Mock payment methods data
const paymentMethods: PaymentMethod[] = [
  {
    id: 'mtn',
    name: 'MTN MoMo',
    displayName: 'MTN MoMo',
    logo: require('../../assets/momo.jpeg'),
    lewaCharge: 500,
  },
  {
    id: 'orange',
    name: 'Orange Money',
    displayName: 'Orange Money',
    logo: require('../../assets/orange-money.png'),
    lewaCharge: 500,
  },
  {
    id: 'bank',
    name: 'Banque Atlantique',
    displayName: 'banque atlantique',
    logo: require('../../assets/bank-atlantic.jpeg'),
    lewaCharge: 0,
  },
];

const PaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<PaymentMethodScreenNavigationProp>();
  const route = useRoute<PaymentMethodScreenRouteProp>();
  const { feeType, amount } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<string>('mtn');
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(index);
  };

  const handleNext = () => {
    // Navigate to confirm number screen
    navigation.navigate('ConfirmNumber', { feeType, amount, paymentMethod: selectedMethod });
  };

  const feeTypeText = feeType === 'complete' ? 'Complete Fee' : 'Half Fee';

  return (
    <View style={styles.container}>

    {/* Fixed Top Header */}
    <AppHeader />

    {/* <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
    > */}
        {/* Header */}
        <View style={styles.header}>

          {/* Back Button and Title */}
          <View style={styles.titleSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#1F2933" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Payment method</Text>
          </View>
        </View>

        {/* Payment Method Cards Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
          >
            {paymentMethods.map((method, index) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  index === 0 && { marginLeft: 40 },
                  index === paymentMethods.length - 1 && { marginRight: 40 },
                ]}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.9}
              >
                {/* Radio Button */}
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={[
                    styles.radioOuter,
                    selectedMethod === method.id && styles.radioOuterSelected
                  ]}>
                    {selectedMethod === method.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Logo */}
                <View style={styles.logoContainer}>
                  <Image source={method.logo} style={styles.logo} />
                </View>

                {/* Payment Method Name */}
                <Text style={styles.methodName}>{method.displayName}</Text>

                {/* Fee Details */}
                <Text style={styles.feeDetails}>
                  {feeTypeText} + Lewa charge
                </Text>

                {/* Total Amount */}
                <Text style={styles.totalAmount}>
                  {(amount + method.lewaCharge).toLocaleString()} <Text style={styles.currency}>FCFA</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Carousel Indicators */}
          <View style={styles.indicatorContainer}>
            {paymentMethods.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel</Text>
            )}
          </TouchableOpacity> */}


          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>

          
        </View>

        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      {/* </ScrollView> */}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
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
    borderRadius: 30,
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
    flex: 1,
    textAlign: 'center',
  },
  carouselContainer: {
    marginTop: 60,
    marginBottom: 20,
  },
  carouselContent: {
    paddingVertical: 40,
  },
  paymentCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: CARD_SPACING / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  radioButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  methodName: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  feeDetails: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 12,
  },
  totalAmount: {
    fontSize: 25,
    fontFamily: 'Poppins_700SemiBold',
    color: colors.primary,
  },
  currency: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  indicator: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  indicatorActive: {
    width: 40,
    backgroundColor: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
    gap: 16,
    bottom: 0,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 56,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
});

export default PaymentMethodScreen;

