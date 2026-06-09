/**
 * PaymentMethodScreen Component
 * 
 * Screen for selecting payment method with carousel of payment options
 */

import React, { useState, useRef, useEffect } from 'react';
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
  BackHandler,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast, showSuccessToast } from '../services/toast';
import { resetToMainTab } from '../navigation/resetNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';
const CARD_WIDTH = SCREEN_WIDTH - (IS_ANDROID ? 64 : 80);
const CARD_SPACING = IS_ANDROID ? 14 : 20;

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
  PaymentSummary: {
    paymentType: 'fee' | 'subscription';
    feeInstallment?: 'full' | 'half' | null;
    amount: number;
    paymentMethod: string;
    phoneNumber: string
  };
  PaymentProcessing: {
    paymentType: 'fee' | 'subscription';
    feeInstallment?: 'full' | 'half' | null;
    amount: number;
    paymentMethod: string;
    phoneNumber: string
  };
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
  const { paymentType, feeInstallment, amount } = route.params;
  const { user } = useAuth();
  const isAndroid = IS_ANDROID;
  const insets = useSafeAreaInsets();
  const androidBottomPadding = Math.max(insets.bottom + 18, 32);

  const [selectedMethod, setSelectedMethod] = useState<string>('mtn');
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Handle back button for subscription flow
  useEffect(() => {
    if (paymentType === 'fee' && user?.fee_status === 'PAID') {
      showSuccessToast("You've completed fees for this school year.");
      resetToMainTab(navigation);
      return;
    }

    if (paymentType === 'fee' && user?.fee_status === 'PARTIAL' && feeInstallment === 'full') {
      showErrorToast("You've already paid half. Please complete the remaining half payment.");
      navigation.navigate('FeeSelection');
      return;
    }

    if (paymentType === 'subscription') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Subscription payments return to a clean Home root.
        resetToMainTab(navigation);
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [feeInstallment, paymentType, navigation, user?.fee_status]);

  if (!fontsLoaded) {
    return null;
  }

  // Custom back handler
  const handleBack = () => {
    if (paymentType === 'subscription') {
      // Go directly to a clean Home root for subscription flow.
      resetToMainTab(navigation);
    } else {
      // Normal back navigation for fee flow
      navigation.goBack();
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (paymentType === 'fee' && user?.fee_status === 'PAID') {
      showSuccessToast("You've completed fees for this school year.");
      resetToMainTab(navigation);
      return;
    }

    if (paymentType === 'fee' && user?.fee_status === 'PARTIAL' && feeInstallment === 'full') {
      showErrorToast("You've already paid half. Please complete the remaining half payment.");
      navigation.navigate('FeeSelection');
      return;
    }

    // Navigate to confirm number screen with accumulated data
    navigation.navigate('ConfirmNumber', {
      paymentType,
      feeInstallment,
      amount,
      paymentMethod: selectedMethod
    });
  };

  // Dynamic payment type text
  const paymentTypeText = paymentType === 'subscription'
    ? 'Yearly Subscription'
    : feeInstallment === 'full'
      ? 'Complete Fee'
      : 'Half Fee';

  return (
    <View style={styles.container}>

    {/* Fixed Top Header */}
    <AppHeader title="Payment method" onBackPress={handleBack} />

    {/* <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
    > */}
      <View style={[styles.contentShell, isAndroid && styles.androidContentShell]}>
        {/* Payment Method Cards Carousel */}
        <View style={[styles.carouselStage, isAndroid && styles.androidCarouselStage]}>
          <View style={[styles.carouselContainer, isAndroid && styles.androidCarouselContainer]}>
            <Text style={[styles.selectHint, isAndroid && styles.androidSelectHint]}>
              Swipe to select your preferred payment method
            </Text>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              decelerationRate="fast"
              contentContainerStyle={[styles.carouselContent, isAndroid && styles.androidCarouselContent]}
            >
              {paymentMethods.map((method, index) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentCard,
                    isAndroid && styles.androidPaymentCard,
                    index === 0 && { marginLeft: isAndroid ? 32 : 40 },
                    index === paymentMethods.length - 1 && { marginRight: isAndroid ? 32 : 40 },
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                  activeOpacity={0.9}
                >
                  {/* Radio Button */}
                  <TouchableOpacity
                    style={[styles.radioButton, isAndroid && styles.androidRadioButton]}
                    onPress={() => setSelectedMethod(method.id)}
                  >
                    <View style={[
                      styles.radioOuter,
                      isAndroid && styles.androidRadioOuter,
                      selectedMethod === method.id && styles.radioOuterSelected
                    ]}>
                      {selectedMethod === method.id && (
                        <View style={[styles.radioInner, isAndroid && styles.androidRadioInner]} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Logo */}
                  <View style={[styles.logoContainer, isAndroid && styles.androidLogoContainer]}>
                    <Image source={method.logo} style={[styles.logo, isAndroid && styles.androidLogo]} />
                  </View>

                  {/* Payment Method Name */}
                  <Text style={[styles.methodName, isAndroid && styles.androidMethodName]}>
                    {method.displayName}
                  </Text>

                  {/* Payment Type */}
                  <Text style={[styles.feeDetails, isAndroid && styles.androidFeeDetails]}>
                    {paymentTypeText}
                  </Text>

                  {/* Amount */}
                  <Text style={[styles.totalAmount, isAndroid && styles.androidTotalAmount]}>
                    {amount.toLocaleString()} <Text style={[styles.currency, isAndroid && styles.androidCurrency]}>XAF</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Carousel Indicators */}
            <View style={[styles.indicatorContainer, isAndroid && styles.androidIndicatorContainer]}>
              {paymentMethods.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    isAndroid && styles.androidIndicator,
                    currentIndex === index && styles.indicatorActive,
                    isAndroid && currentIndex === index && styles.androidIndicatorActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={[
            styles.actionButtons,
            isAndroid && styles.androidActionButtons,
            isAndroid && { paddingBottom: androidBottomPadding },
          ]}
        >
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
            style={[styles.nextButton, isAndroid && styles.androidNextButton]}
            onPress={handleNext}
          >
            <Text style={[styles.nextButtonText, isAndroid && styles.androidNextButtonText]}>
              Next
            </Text>
          </TouchableOpacity>

          
        </View>

        {/* Bottom padding */}
        <View style={[styles.bottomSpacer, isAndroid && styles.androidBottomSpacer]} />
      </View>
      {/* </ScrollView> */}

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
  contentShell: {
    flex: 1,
  },
  androidContentShell: {
    justifyContent: 'space-between',
  },
  selectHint: {
    paddingHorizontal: 32,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
  },
  androidSelectHint: {
    paddingHorizontal: 28,
    marginBottom: 6,
    fontSize: 11.5,
    lineHeight: 17,
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
    marginTop: 48,
    marginBottom: 20,
  },
  carouselStage: {
    width: '100%',
  },
  // I only center the stage on Android so the carousel keeps its real size.
  androidCarouselStage: {
    flex: 1,
    justifyContent: 'center',
  },
  androidCarouselContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  carouselContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  androidCarouselContent: {
    paddingTop: 10,
    paddingBottom: 22,
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
  androidPaymentCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 0,
  },
  radioButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  androidRadioButton: {
    top: 16,
    right: 16,
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
  androidRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  androidRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
  androidLogoContainer: {
    width: 78,
    height: 78,
    borderRadius: 16,
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  androidLogo: {
    width: 78,
    height: 78,
  },
  methodName: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  androidMethodName: {
    fontSize: 19,
    lineHeight: 25,
    marginBottom: 6,
  },
  feeDetails: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 12,
  },
  androidFeeDetails: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 9,
  },
  totalAmount: {
    fontSize: 25,
    fontFamily: 'Poppins_700SemiBold',
    color: colors.primary,
  },
  androidTotalAmount: {
    fontSize: 22,
    lineHeight: 28,
  },
  currency: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  androidCurrency: {
    fontSize: 14,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  androidIndicatorContainer: {
    marginTop: 10,
    gap: 6,
  },
  indicator: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  androidIndicator: {
    width: 18,
    height: 5,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 40,
    backgroundColor: colors.primary,
  },
  androidIndicatorActive: {
    width: 32,
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
  androidActionButtons: {
    paddingTop: 0,
    paddingHorizontal: 32,
    paddingBottom: 28,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidNextButton: {
    paddingVertical: 13,
    borderRadius: 24,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  androidNextButtonText: {
    fontSize: 14,
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
  bottomSpacer: {
    height: 120,
  },
  androidBottomSpacer: {
    height: 0,
  },
});

export default PaymentMethodScreen;
