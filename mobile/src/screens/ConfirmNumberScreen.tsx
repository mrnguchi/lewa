/**
 * ConfirmNumberScreen Component
 * 
 * Screen for confirming phone number for payment
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  PaymentMethod: { feeType: 'complete' | 'half'; amount: number };
  ConfirmNumber: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string };
  PaymentSummary: { feeType: 'complete' | 'half'; amount: number; paymentMethod: string; phoneNumber: string };
};

type ConfirmNumberScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConfirmNumber'>;
type ConfirmNumberScreenRouteProp = RouteProp<RootStackParamList, 'ConfirmNumber'>;

const ConfirmNumberScreen: React.FC = () => {
  const navigation = useNavigation<ConfirmNumberScreenNavigationProp>();
  const route = useRoute<ConfirmNumberScreenRouteProp>();
  const { feeType, amount, paymentMethod } = route.params;
  // Store only digits internally (Cameroon numbers are 9 digits)
  const initialDigits = '677268983';
  const [phoneNumber, setPhoneNumber] = useState(initialDigits);
  const [countryCode] = useState('+237');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Validate Cameroon phone number (must be 9 digits starting with 6 or 7)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-7]\d{8}$/;
    return phoneRegex.test(phone);
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleNext = () => {
    setErrorMessage('');

    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Invalid phone number (must be 9 digits starting with 6 or 7)');
      return;
    }

    navigation.navigate('PaymentSummary', {
      feeType,
      amount,
      paymentMethod,
      phoneNumber: `${countryCode}${phoneNumber}`
    });
  };

  // const handleCancel = async () => {
  //   setIsCancelling(true);
  //   // Simulate API call to cancel payment
  //   setTimeout(() => {
  //     setIsCancelling(false);
  //     if (onCancel) {
  //       onCancel();
  //     }
  //   }, 2000);
  // };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        
          <AppHeader />

          {/* Back Button and Title */}
          <View style={styles.titleSection}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#1F2933" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Confirm number</Text>
            </View>
        

        {/* Content */}        
        <View style={styles.content}>
          {/* icon section */}
          <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="call" size={48} color={colors.primary} />
          </View>
        </View>

          {/* Instruction Text */}
          <Text style={styles.instructionText}>
            Change number if you want to make payment with a number from the one on your profile
          </Text>

          {/* Error message */}
          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}

          {/* Phone Number Input */}
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryCodeText}>{countryCode}</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '').slice(0, 9);
                setPhoneNumber(cleaned);
                setErrorMessage('');
              }}
              placeholder="677 - 268 - 983"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={9}
            />
          </View>

          <View style={styles.buttonsContainer}>
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
            disabled={isCancelling}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>

          
        </View>
        </View>

        {/* Buttons */}
        
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  // header: {
  //   paddingHorizontal: 20,
  //   paddingTop: 60,
  //   paddingBottom: 20,
  //   backgroundColor: colors.white,
  // },
  
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    left: 0,
    zIndex: 10,
    paddingVertical: 8,
    paddingLeft: 20,
  },

  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    textAlign: 'center',
    marginTop: -8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignContent: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  iconSection: {
    alignItems: 'center',
    marginBottom: 1,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 80,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -120,
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 15,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  countryCodeBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    letterSpacing: 5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 70,
    gap: 12,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
});

export default ConfirmNumberScreen;

