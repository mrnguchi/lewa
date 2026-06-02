/**
 * RegisterScreen Component
 *
 * Student registration screen with form validation
 * Fields: Full Name, Faculty (dropdown), Matricule, Phone Number, Password, Confirm Password
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CustomToast from '../components/CustomToast';
import { colors } from '../theme/colors';

// List of faculties at the University of Buea
const FACULTIES = [
  'Faculty of Arts',
  'Faculty of Veterinary Medicine and Agriculture',
  'Faculty of Education',
  'Faculty of Engineering and Technology',
  'Faculty of Health Sciences',
  'Faculty of Science',
  'Faculty of Social and Management Sciences (SMS)',
  'Faculty of Laws and Political Science',
  'College of Technology (COT)',
  'Higher Technical Teachers\' Training College Kumba (HTTTC)',
  'Advanced School of Translators and Interpreters (ASTI)',
];

// Faculty to Department mapping
const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  'Faculty of Arts': [
    'Department Of English',
    'Department Of French',
    'Department Of History',
    'Department Of Linguistics',
    'Department Of Performing And Visual Arts',
  ],
  'Faculty of Veterinary Medicine and Agriculture': [
    'Department of Agricultural Economics and Agribusiness',
    'Department of Agricultural Extension and Rural Development',
    'Department of Agronomic and Applied Molecular Sciences',
    'Department of Animal Science',
    'Department of Food Science and Technology',
    'Department of Forestry and Wildlife',
    'Department of Veterinary Medicine',
  ],
  'Faculty of Education': [
    'Department of Curriculum Studies and Teaching (CST)',
    'Department of Educational Foundations Administration (EFA)',
    'Department of Educational Psychology (EPY)',
  ],
  'Faculty of Engineering and Technology': [
    'Department of Computer Engineering',
    'Department of Electrical and Electronic Engineering',
    'Department of Civil Engineering',
  ],
  'Faculty of Health Sciences': [
    'Department of Biomedical Sciences',
    'Department of Nursing',
    'Department of Medical Laboratory Sciences',
    'Department of Public Health and Hygiene',
  ],
  'Faculty of Science': [
    'Department Of Biochemistry and Molecular Biology',
    'Department Of Botany and Plant Physiology',
    'Department Of Chemistry',
    'Department Of Computer Science',
    'Department Of Environmental Science',
    'Department Of Geology',
    'Department Of Mathematics',
    'Department Of Microbiology and Parasitology',
    'Department Of Physics',
    'Department Of Zoology and Animal Physiology',
  ],
  'Faculty of Social and Management Sciences (SMS)': [
    'Department Of Banking and Finance',
    'Department Of Economics and Management',
    'Department Of Management',
    'Department Of Geography',
    'Department Of Journalism and Mass Communications',
    'Department Of Sociology and Anthropology',
    'Department Of Women and Gender Studies',
  ],
  'Faculty of Laws and Political Science': [
    'Department of Business Law',
    'Department of Civil Law',
    'Department of English Law',
    'Department of Political Science and Comparative Politics',
    'Department of Public Law and Public Administration',
    'Department of International Relations and Conflict Resolutions',
  ],
  'College of Technology (COT)': [
    'Department of Computer Engineering',
    'Department of Electrical and Electronic Engineering',
    'Department of Mechanical Engineering',
  ],
  'Higher Technical Teachers\' Training College Kumba (HTTTC)': [
    'Department Of Administrative Techniques',
    'Department Of Agriculture',
    'Department Of Civil Engineering and Forestry Techniques',
    'Department Of Computer Science',
    'Department Of Electrical and Power Engineering',
    'Department Of Guidance Counselling',
    'Department Of Law',
    'Department Of Management Science',
    'Department Of Mechanical Engineering',
    'Department Of Renewable Energy',
    'Department Of Science of Education',
    'Department Of Social Economy and Family Management',
    'Department Of Topography and Real Estate Management',
    'Department Of Tourism and Hospitality Management',
  ],
  'Advanced School of Translators and Interpreters (ASTI)': [
    'Department Of General Studies And Promotion Of Bilingualism',
    'Department Of Interpretation',
    'Department Of Translation',
  ],
};

// List of academic levels
const LEVELS = [200, 300, 400, 500];

interface RegisterScreenProps {
  onLoginPress: () => void;
  onRegisterSuccess: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onLoginPress, onRegisterSuccess }) => {
  // Get auth context
  const { login } = useAuth();

  // Form state
  const [fullName, setFullName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [matricule, setMatricule] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Load fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // Validate Cameroon phone number (must be 9 digits)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-7]\d{8}$/; // Cameroon numbers start with 6 or 7 and have 9 digits
    return phoneRegex.test(phone);
  };

  // Validate matricule format (example: FE12A001)
  const validateMatricule = (mat: string): boolean => {
    const matriculeRegex = /^[A-Z]{2}\d{2}[A-Z]\d{3,4}$/i;
    return matriculeRegex.test(mat);
  };

  // Validate full name (at least 2 words)
  const validateFullName = (name: string): boolean => {
    const nameParts = name.trim().split(' ');
    return nameParts.length >= 2 && nameParts.every(part => part.length > 0);
  };

  // Validate password strength
  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6;
  };

  // Handle form submission
  const handleSignUp = async () => {
    const errors = new Set<string>();
    setErrorMessage('');

    // Validate all fields
    if (!validateFullName(fullName)) {
      errors.add('fullName');
      setErrorMessage('Please enter your full name (first and last name)');
      setFieldErrors(errors);
      return;
    }

    if (!faculty) {
      errors.add('faculty');
      setErrorMessage('Please select your faculty');
      setFieldErrors(errors);
      return;
    }

    if (!department) {
      errors.add('department');
      setErrorMessage('Please select your department');
      setFieldErrors(errors);
      return;
    }

    if (!level) {
      errors.add('level');
      setErrorMessage('Please select your level');
      setFieldErrors(errors);
      return;
    }

    if (!validateMatricule(matricule)) {
      errors.add('matricule');
      setErrorMessage('Invalid matricule format (e.g., FE12A001)');
      setFieldErrors(errors);
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      errors.add('phoneNumber');
      setErrorMessage('Invalid phone number (must be 9 digits starting with 6 or 7)');
      setFieldErrors(errors);
      return;
    }

    if (!validatePassword(password)) {
      errors.add('password');
      setErrorMessage('Password must be at least 6 characters');
      setFieldErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      errors.add('confirmPassword');
      setErrorMessage('Passwords do not match');
      setFieldErrors(errors);
      return;
    }

    // All validations passed
    setFieldErrors(new Set());
    setErrorMessage('');
    setIsLoading(true);

    try {
      // Call backend registration API
      const response = await api.post('/api/auth/register', {
        full_name: fullName,
        matricule: matricule.toUpperCase(),
        phone_number: `237${phoneNumber}`, // Format with country code
        password: password,
        faculty: faculty,
        department: department,
        level: level, // User-selected level
      });

      console.log('Registration response:', response.data);

      // Extract data from response - backend now returns { success, data: { token, data: {...} } }
      const registrationData = response.data.data;
      const token = registrationData.token;
      const userData = registrationData.data;

      console.log('Extracted token:', token);
      console.log('Extracted user data:', userData);

      // Auto-login the user
      await login(token, userData);

      console.log('User registered and logged in successfully');

      setIsLoading(false);

      // Show success toast
      setToastMessage('Registration successful! Welcome to Lewa!');
      setToastType('success');
      setToastVisible(true);

      // Navigate to main app after toast duration
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);

    } catch (error: any) {
      setIsLoading(false);

      let errorMsg = error.userMessage || 'Registration failed. Please try again.';

      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timeout. Please check your internet connection and try again.';
      } else if (error.response) {
        errorMsg = error.response.data?.message || 'Registration failed. Please try again.';
      } else if (error.request) {
        errorMsg = 'Cannot connect to server. Please check if the backend is running.';
      }

      setErrorMessage(errorMsg);

      // Show error toast
      setToastMessage(errorMsg);
      setToastType('error');
      setToastVisible(true);
    }
  };




  // Show loading indicator while fonts load
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#167846" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Custom Toast */}
      <CustomToast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      {/* Green header section with logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* White content section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* "Get Started" heading */}
          <Text style={styles.heading}>Get Started</Text>

          {/* Error message display */}
          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}


          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, fieldErrors.has('fullName') && styles.inputError]}
              placeholder="Enter Full Name"
              placeholderTextColor="#999"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setFieldErrors(prev => {
                  const newErrors = new Set(prev);
                  newErrors.delete('fullName');
                  return newErrors;
                });
              }}
              autoCapitalize="words"
            />
          </View>

          {/* Faculty Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Faculty or School</Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.dropdownInput,
                fieldErrors.has('faculty') && styles.inputError,
              ]}
              onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
            >
              <Text style={[styles.inputText, !faculty && styles.placeholderText]}>
                {faculty || 'Select Faculty'}
              </Text>
              <Ionicons
                name={showFacultyDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>

            {/* Dropdown menu */}
            {showFacultyDropdown && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {FACULTIES.map((fac, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFaculty(fac);
                        setDepartment(''); // Reset department when faculty changes
                        setShowFacultyDropdown(false);
                        setFieldErrors(prev => {
                          const newErrors = new Set(prev);
                          newErrors.delete('faculty');
                          newErrors.delete('department'); // Also clear department error
                          return newErrors;
                        });
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{fac}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Department Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.dropdownInput,
                fieldErrors.has('department') && styles.inputError,
                !faculty && styles.inputDisabled, // Disable if no faculty selected
              ]}
              onPress={() => {
                if (faculty) {
                  setShowDepartmentDropdown(!showDepartmentDropdown);
                }
              }}
              disabled={!faculty}
            >
              <Text style={[styles.inputText, !department && styles.placeholderText]}>
                {department || (faculty ? 'Select Department' : 'Select Faculty First')}
              </Text>
              <Ionicons
                name={showDepartmentDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={faculty ? "#999" : "#ccc"}
              />
            </TouchableOpacity>

            {/* Dropdown menu */}
            {showDepartmentDropdown && faculty && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {FACULTY_DEPARTMENTS[faculty]?.map((dept, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDepartment(dept);
                        setShowDepartmentDropdown(false);
                        setFieldErrors(prev => {
                          const newErrors = new Set(prev);
                          newErrors.delete('department');
                          return newErrors;
                        });
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{dept}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Level Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Level</Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.dropdownInput,
                fieldErrors.has('level') && styles.inputError,
              ]}
              onPress={() => setShowLevelDropdown(!showLevelDropdown)}
            >
              <Text style={[styles.inputText, !level && styles.placeholderText]}>
                {level ? `Level ${level}` : 'Select Level'}
              </Text>
              <Ionicons
                name={showLevelDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>

            {/* Dropdown menu */}
            {showLevelDropdown && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {LEVELS.map((lvl, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setLevel(lvl);
                        setShowLevelDropdown(false);
                        setFieldErrors(prev => {
                          const newErrors = new Set(prev);
                          newErrors.delete('level');
                          return newErrors;
                        });
                      }}
                    >
                      <Text style={styles.dropdownItemText}>Level {lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Matricule Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Matricule</Text>
            <TextInput
              style={[styles.input, fieldErrors.has('matricule') && styles.inputError]}
              placeholder="Enter Matricule"
              placeholderTextColor="#999"
              value={matricule}
              onChangeText={(text) => {
                setMatricule(text.toUpperCase());
                setFieldErrors(prev => {
                  const newErrors = new Set(prev);
                  newErrors.delete('matricule');
                  return newErrors;
                });
              }}
              autoCapitalize="characters"
            />
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone number</Text>
            <View style={[styles.input, styles.phoneInputContainer, fieldErrors.has('phoneNumber') && styles.inputError]}>
              <Text style={styles.countryCode}>+237</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter Phone number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={(text) => {
                  // Only allow digits and limit to 9 characters
                  const cleaned = text.replace(/\D/g, '').slice(0, 9);
                  setPhoneNumber(cleaned);
                  setFieldErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('phoneNumber');
                    return newErrors;
                  });
                }}
                keyboardType="phone-pad"
                maxLength={9}
              />
            </View>
          </View>


          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.input, styles.passwordInputContainer, fieldErrors.has('password') && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setFieldErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('password');
                    return newErrors;
                  });
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.input, styles.passwordInputContainer, fieldErrors.has('confirmPassword') && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setFieldErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('confirmPassword');
                    return newErrors;
                  });
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account ? </Text>
            <TouchableOpacity onPress={onLoginPress}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#167846',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#167846',
    paddingTop: 60,
    paddingBottom: 50,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 120,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 24,
    marginTop:20,
  },
  scrollView: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D1',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D1D1D1',
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
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#167846',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  signUpButton: {
    backgroundColor: '#167846',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 20,
  },
  signUpButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loginLinkText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#167846',
  },
});

export default RegisterScreen;
