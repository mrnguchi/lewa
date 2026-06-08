/**
 * SupportDeskScreen Component
 * 
 * Screen for displaying FAQs and submitting complaints
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../hooks/useAuth';
import { createComplaintConversation } from '../services/lewaChat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// FAQ data
const faqs = [
  {
    id: 1,
    question: 'How long does payment confirmation take?',
    answer: 'Payment confirmation typically takes 2-5 minutes after you complete the transaction. You will receive a notification once your payment is confirmed.',
  },
  {
    id: 2,
    question: 'What payment methods are supported?',
    answer: 'We support MTN Mobile Money, Orange Money, and bank transfers. You can select your preferred payment method during the payment process.',
  },
  {
    id: 3,
    question: 'How do I download my receipt?',
    answer: 'Go to "My Receipts" from the home screen, select the payment you want, and tap the "Download receipt" button at the bottom of the screen.',
  },
  {
    id: 4,
    question: 'Can I pay my fees in installments?',
    answer: 'Yes, you can choose to pay either complete fees or half fees (installment) during the fee selection process.',
  },
  {
    id: 5,
    question: 'What should I do if my payment fails?',
    answer: 'If your payment fails, please check your account balance and try again. If the problem persists, contact your mobile money provider or submit a complaint through our support desk.',
  },
  {
    id: 6,
    question: 'How do I contact support?',
    answer: 'You can contact support by tapping the "Submit a complaint" button at the bottom of the FAQ page. Fill out the form with your details and we will get back to you as soon as possible.',
    },
    {
    id: 7,
    question: 'Is there a customer support hotline?',
    answer: 'Currently, we do not have a customer support hotline. Please use the "Submit a complaint" form to reach out to us, and we will respond promptly.',
  },
];

// Faculties list
const faculties = [
  'Select Faculty',
  'College of Technology',
  'Faculty of Science',
  'Faculty of Arts',
  'Faculty of Engineering',
  'Faculty of Health Sciences',
  'Faculty of Social and Management Sciences',
  'Faculty of Education',
  'Faculty of Agriculture and Veterinary Medicine',
];

const normalizeCameroonLocalPhone = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  const withoutCountryCode = digits.startsWith('237') ? digits.slice(3) : digits;

  return withoutCountryCode.slice(0, 9);
};

type RootStackParamList = {
  MainTabs: { screen: string };
  SupportDesk: undefined;
  SchoolAdminChat: { conversationId?: string } | undefined;
};

type SupportDeskScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SupportDesk'>;

const SupportDeskScreen: React.FC = () => {
  const navigation = useNavigation<SupportDeskScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { user } = useAuth();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

  // Form state
  const [studentName, setStudentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [faculty, setFaculty] = useState('');
  const [description, setDescription] = useState('');

  // Error state
  const [errors, setErrors] = useState({
    studentName: '',
    phoneNumber: '',
    matricule: '',
    faculty: '',
    description: '',
  });

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setStudentName((currentValue) => currentValue || user.full_name);
    setPhoneNumber((currentValue) => currentValue || normalizeCameroonLocalPhone(user.phone_number));
    setMatricule((currentValue) => currentValue || user.matricule);
    setFaculty((currentValue) => currentValue || user.faculty);
  }, [user]);

  if (!fontsLoaded) {
    return null;
  }

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const validateForm = (): boolean => {
    const newErrors = {
      studentName: '',
      phoneNumber: '',
      matricule: '',
      faculty: '',
      description: '',
    };

    let isValid = true;

    // Student name validation
    if (!studentName.trim()) {
      newErrors.studentName = 'Student name is required';
      isValid = false;
    }

    // Phone number validation (Cameroon format: 9 digits starting with 6 or 7)
    const phoneRegex = /^[6-7]\d{8}$/;
    const normalizedPhoneNumber = normalizeCameroonLocalPhone(phoneNumber);
    if (phoneNumber !== normalizedPhoneNumber) {
      setPhoneNumber(normalizedPhoneNumber);
    }

    if (!normalizedPhoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!phoneRegex.test(normalizedPhoneNumber)) {
      newErrors.phoneNumber = 'Invalid Cameroon phone number (e.g., 671234567)';
      isValid = false;
    }

    // Matricule validation
    const matriculeRegex = /^[A-Z]{2}\d{2}[A-Z]\d{3}$/;
    if (!matricule.trim()) {
      newErrors.matricule = 'Matricule is required';
      isValid = false;
    } else if (!matriculeRegex.test(matricule.trim())) {
      newErrors.matricule = 'Invalid matricule format (e.g., CT24A456)';
      isValid = false;
    }

    // Faculty validation
    if (!faculty) {
      newErrors.faculty = 'Please select a faculty';
      isValid = false;
    }

    // Description validation (max 30 words)
    if (!description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    } else {
      const wordCount = description.trim().split(/\s+/).length;
      if (wordCount > 30) {
        newErrors.description = `Description must not exceed 30 words (current: ${wordCount})`;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmitComplaint = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createComplaintConversation({
        title: `${user?.department || faculty} support`,
        description: description.trim(),
      });

      setIsSubmitting(false);
      setShowComplaintModal(false);

      // Reset form
      setStudentName('');
      setPhoneNumber('');
      setMatricule('');
      setFaculty('');
      setDescription('');
      setShowFacultyDropdown(false);
      setErrors({
        studentName: '',
        phoneNumber: '',
        matricule: '',
        faculty: '',
        description: '',
      });

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
        navigation.replace('SchoolAdminChat', {
          conversationId: result.conversation.id,
        });
      }, 800);
    } catch {
      setIsSubmitting(false);
      setErrors((currentErrors) => ({
        ...currentErrors,
        description: '',
      }));
    }
  };

  const handleCloseModal = () => {
    setShowComplaintModal(false);
    setShowFacultyDropdown(false);
    setErrors({
      studentName: '',
      phoneNumber: '',
      matricule: '',
      faculty: '',
      description: '',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Top Section - NOT in ScrollView */}
      <AppHeader title="FAQ's" onBackPress={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isAndroid && styles.scrollContentAndroid,
        ]}
      >
        

        {/* FAQ Accordion */}
        <View style={[styles.faqContainer, isAndroid && styles.faqContainerAndroid]}>
          {faqs.map((faq, index) => (
            <View
              key={faq.id}
              style={[styles.faqItem, isAndroid && styles.faqItemAndroid]}
            >
              <TouchableOpacity
                style={[styles.faqQuestion, isAndroid && styles.faqQuestionAndroid]}
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.faqQuestionText,
                    isAndroid && styles.faqQuestionTextAndroid,
                  ]}
                >
                  {faq.question}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={colors.primary}
                  style={[
                    styles.chevronIcon,
                    expandedIndex === index && styles.chevronIconExpanded,
                  ]}
                />
              </TouchableOpacity>

              {expandedIndex === index && (
                <View style={styles.faqAnswer}>
                  <Text
                    style={[
                      styles.faqAnswerText,
                      isAndroid && styles.faqAnswerTextAndroid,
                    ]}
                  >
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit Complaint Button */}
        <View
          style={[
            styles.submitButtonContainer,
            isAndroid && styles.submitButtonContainerAndroid,
            isAndroid && { paddingBottom: Math.max(insets.bottom + 10, 20) },
          ]}
        >
          <TouchableOpacity
          style={[styles.submitButton, isAndroid && styles.submitButtonAndroid]}
          onPress={() => setShowComplaintModal(true)}
        >
          <Text style={[styles.submitButtonText, isAndroid && styles.submitButtonTextAndroid]}>
            Submit a complaint
          </Text>
          <Ionicons name="arrow-forward" size={24} color={colors.white} />
        </TouchableOpacity>
        </View>

      {/* Complaint Bottom Sheet */}
      <Modal
        visible={showComplaintModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View
            style={[
              styles.complaintModal,
              isAndroid && styles.complaintModalAndroid,
              isAndroid && { paddingBottom: Math.max(insets.bottom + 14, 24) },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.complaintHeader}>
                <Text
                  style={[
                    styles.complaintTitle,
                    isAndroid && styles.complaintTitleAndroid,
                  ]}
                >
                  Submit a Complaint
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.complaintSubtitle,
                  isAndroid && styles.complaintSubtitleAndroid,
                ]}
              >
                We'll get back to you soon
              </Text>

              {/* Scrollable Form Content */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.formScrollContainer}
                >
                    {/* Student Name */}
                    <View style={[styles.formGroup, isAndroid && styles.formGroupAndroid]}>
                      <Text style={[styles.label, isAndroid && styles.labelAndroid]}>
                        Student Name
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          isAndroid && styles.inputAndroid,
                          errors.studentName && styles.inputError,
                        ]}
                        placeholder="Enter your full name"
                        placeholderTextColor="#9CA3AF"
                        value={studentName}
                        onChangeText={setStudentName}
                      />
                      {errors.studentName ? (
                        <Text style={styles.errorText}>{errors.studentName}</Text>
                      ) : null}
                    </View>

                    {/* Phone Number */}
                    <View style={[styles.formGroup, isAndroid && styles.formGroupAndroid]}>
                      <Text style={[styles.label, isAndroid && styles.labelAndroid]}>
                        Phone Number
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          isAndroid && styles.inputAndroid,
                          errors.phoneNumber && styles.inputError,
                        ]}
                        placeholder="671234567"
                        placeholderTextColor="#9CA3AF"
                        value={phoneNumber}
                        onChangeText={(text) => {
                          setPhoneNumber(normalizeCameroonLocalPhone(text));
                          setErrors((currentErrors) => ({ ...currentErrors, phoneNumber: '' }));
                        }}
                        keyboardType="phone-pad"
                      />
                      {errors.phoneNumber ? (
                        <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                      ) : null}
                    </View>

                    {/* Matricule */}
                    <View style={[styles.formGroup, isAndroid && styles.formGroupAndroid]}>
                      <Text style={[styles.label, isAndroid && styles.labelAndroid]}>
                        Matricule
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          isAndroid && styles.inputAndroid,
                          errors.matricule && styles.inputError,
                        ]}
                        placeholder="CT24A456"
                        placeholderTextColor="#9CA3AF"
                        value={matricule}
                        onChangeText={(text) => setMatricule(text.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={8}
                      />
                      {errors.matricule ? (
                        <Text style={styles.errorText}>{errors.matricule}</Text>
                      ) : null}
                    </View>

                    {/* Faculty */}
                    <View style={[styles.formGroup, isAndroid && styles.formGroupAndroid]}>
                      <Text style={[styles.label, isAndroid && styles.labelAndroid]}>
                        Faculty
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          isAndroid && styles.inputAndroid,
                          styles.dropdownInput,
                          errors.faculty && styles.inputError,
                        ]}
                        onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
                      >
                        <Text style={[styles.inputText, !faculty && styles.placeholderText]}>
                          {faculty || 'Select Faculty'}
                        </Text>
                        <Ionicons
                          name={showFacultyDropdown ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>

                      {/* Dropdown menu */}
                      {showFacultyDropdown && (
                        <View
                          style={[
                            styles.dropdownMenu,
                            isAndroid && styles.dropdownMenuAndroid,
                          ]}
                        >
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                            {faculties.slice(1).map((fac, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setFaculty(fac);
                                  setShowFacultyDropdown(false);
                                  setErrors(prev => ({ ...prev, faculty: '' }));
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{fac}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {errors.faculty ? (
                        <Text style={styles.errorText}>{errors.faculty}</Text>
                      ) : null}
                    </View>

                    {/* Description */}
                    <View style={[styles.formGroup, isAndroid && styles.formGroupAndroid]}>
                      <Text style={[styles.label, isAndroid && styles.labelAndroid]}>
                        Description (Max 30 words)
                      </Text>
                      <TextInput
                        style={[
                          styles.textArea,
                          isAndroid && styles.textAreaAndroid,
                          errors.description && styles.inputError,
                        ]}
                        placeholder="Describe your complaint..."
                        placeholderTextColor="#9CA3AF"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <Text style={styles.wordCount}>
                        {description.trim() ? description.trim().split(/\s+/).length : 0} / 30 words
                      </Text>
                      {errors.description ? (
                        <Text style={styles.errorText}>{errors.description}</Text>
                      ) : null}
                    </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isAndroid && styles.submitButtonAndroid,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitComplaint}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.submitButtonText,
                          isAndroid && styles.submitButtonTextAndroid,
                        ]}
                      >
                        Submit Complaint
                      </Text>
                      <Ionicons name="send-sharp" size={24} color={colors.white} />
                    </View>
                    
                  )}
                </TouchableOpacity>
              </ScrollView>
              </KeyboardAvoidingView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Notification */}
      {showSuccessNotification && (
        <View style={[styles.notification, isAndroid && styles.notificationAndroid]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text
            style={[
              styles.notificationText,
              isAndroid && styles.notificationTextAndroid,
            ]}
          >
            Your complaint has been submitted successfully
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: colors.background,
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
  faqContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,

  },
  // Android FAQ cards stay almost flat so the list feels light and easy to scan.
  faqContainerAndroid: {
    paddingHorizontal: 16,
    marginBottom: 18,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  faqItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 8,
    // elevation: 3,
    // overflow: 'hidden',
  },
  faqItemAndroid: {
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF1F3',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.015,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionAndroid: {
    padding: 14,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    marginRight: 12,
  },
  faqQuestionTextAndroid: {
    fontSize: 14,
  },
  chevronIcon: {
    // Rotation handled by transform in chevronIconExpanded
  },
  chevronIconExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    lineHeight: 22,
  },
  faqAnswerTextAndroid: {
    fontSize: 13,
    lineHeight: 20,
  },
  submitButtonContainer: {
    position: 'relative',
    bottom: 20,
    left: 0,
    right: 0,
    paddingBottom: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonContainerAndroid: {
    bottom: 0,
    paddingTop: 10,
  },
  submitButton: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 30,
    
    marginTop: 8,
  },
  submitButtonAndroid: {
    minHeight: 50,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  submitButtonTextAndroid: {
    fontSize: 14,
  },
  // Modal styles (matching Resources screen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  complaintModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '95%',
  },
  complaintModalAndroid: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  complaintTitleAndroid: {
    fontSize: 18,
  },
  complaintSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 20,
  },
  complaintSubtitleAndroid: {
    fontSize: 12.5,
    marginBottom: 14,
  },
  formScrollContainer: {
    height: '100%',
    
    // flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupAndroid: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    marginBottom: 8,
  },
  labelAndroid: {
    fontSize: 12.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputAndroid: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  inputError: {
    borderColor: colors.error,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  textAreaAndroid: {
    minHeight: 90,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    maxHeight: 250,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownMenuAndroid: {
    top: 76,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  wordCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 4,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.error,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  // Success notification
  notification: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationAndroid: {
    bottom: 84,
    padding: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  notificationTextAndroid: {
    fontSize: 12.5,
  },
});

export default SupportDeskScreen;
