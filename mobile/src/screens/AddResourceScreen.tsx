import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import AppHeader from '../components/AppHeader';
import CustomToast from '../components/CustomToast';
import { colors } from '../theme/colors';
import { createResource, uploadResourceFile } from '../services/resources';
import { ResourceType } from '../types/resources';

type RootStackParamList = {
  AddResource: undefined;
};

type AddResourceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddResource'>;

type SelectedDocument = {
  uri: string;
  name: string;
};

const UB_FACULTIES = [
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

const RESOURCE_LEVELS = [100, 200, 300, 400, 500];

/**
 * Collects resource metadata and uploads the selected PDF file.
 */
export default function AddResourceScreen() {
  const navigation = useNavigation<AddResourceScreenNavigationProp>();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [faculty, setFaculty] = useState('');
  const [level, setLevel] = useState<number>(100);
  const [type, setType] = useState<ResourceType>('handout');
  const [description, setDescription] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormComplete = useMemo(() => {
    return Boolean(code.trim() && title.trim() && faculty.trim() && selectedDocument?.uri);
  }, [code, faculty, selectedDocument, title]);

  /**
   * Displays shared toast feedback for validation and submission states.
   */
  const showToast = (message: string, typeValue: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(typeValue);
    setToastVisible(true);
  };

  /**
   * Opens the document picker and keeps only a selected PDF file.
   */
  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setSelectedDocument({
      uri: result.assets[0].uri,
      name: result.assets[0].name,
    });
  };

  /**
   * Uploads the PDF and creates the resource record in the backend.
   */
  const handleSubmit = async () => {
    if (!isFormComplete || !selectedDocument) {
      showToast('Complete the form and choose a PDF before submitting.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const fileUrl = await uploadResourceFile(selectedDocument.uri, selectedDocument.name);

      await createResource({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        faculty: faculty.trim(),
        level,
        type,
        file_url: fileUrl,
        description: description.trim() || undefined,
      });

      showToast('Resource uploaded successfully.', 'success');
      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error) {
      showToast('Unable to upload this resource right now.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomToast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      <AppHeader />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.secondaryHeader}>
          <View style={styles.secondaryHeaderRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Add Resource</Text>
          </View>
          <Text style={styles.pageSubtitle}>
            Upload a polished PDF resource with the exact details the resource library expects.
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Course Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="CO321"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Programming with UML"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.rowField]}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.darkPickerShell}>
                  <Picker
                    selectedValue={type}
                    onValueChange={(value) => setType(value as ResourceType)}
                    style={styles.darkPicker}
                    dropdownIconColor={colors.white}
                  >
                    <Picker.Item label="Handout" value="handout" color={colors.white} />
                    <Picker.Item label="Past Question" value="pastQuestion" color={colors.white} />
                  </Picker>
                </View>
              </View>

              <View style={[styles.fieldGroup, styles.rowField]}>
                <Text style={styles.label}>Level</Text>
                <View style={styles.darkPickerShell}>
                  <Picker
                    selectedValue={level}
                    onValueChange={(value) => setLevel(Number(value))}
                    style={styles.darkPicker}
                    dropdownIconColor={colors.white}
                  >
                    {RESOURCE_LEVELS.map((levelValue) => (
                      <Picker.Item
                        key={levelValue}
                        label={`${levelValue}`}
                        value={levelValue}
                        color={colors.white}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Faculty</Text>
              <View style={styles.pickerShell}>
                <Picker
                  selectedValue={faculty}
                  onValueChange={(value) => setFaculty(String(value))}
                  style={styles.picker}
                  dropdownIconColor={colors.textPrimary}
                >
                  <Picker.Item label="Select Faculty" value="" color="#9CA3AF" />
                  {UB_FACULTIES.map((facultyOption) => (
                    <Picker.Item
                      key={facultyOption}
                      label={facultyOption}
                      value={facultyOption}
                      color={colors.textPrimary}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add a short note about what this PDF covers."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PDF File</Text>
              <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument}>
                <Ionicons name="document-text-outline" size={20} color={colors.white} />
                <Text style={styles.filePickerButtonText}>
                  {selectedDocument ? 'Change PDF' : 'Choose PDF'}
                </Text>
              </TouchableOpacity>
              <View style={styles.filePreview}>
                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                <Text style={styles.filePreviewText} numberOfLines={1}>
                  {selectedDocument?.name ?? 'No PDF selected yet'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!isFormComplete || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormComplete || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Upload Resource</Text>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  secondaryHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  secondaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  pageSubtitle: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  pickerShell: {
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
  },
  darkPickerShell: {
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    overflow: 'hidden',
  },
  darkPicker: {
    color: colors.white,
  },
  filePickerButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  filePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  filePreview: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#EDF7EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  filePreviewText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#1F2937',
  },
  submitButton: {
    marginTop: 20,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
});
