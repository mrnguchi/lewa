import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Switch,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import AppHeader from '../components/AppHeader';
import CustomToast from '../components/CustomToast';
import { colors } from '../theme/colors';
import {
  buildPublishedAtIso,
  createNewsArticle,
  NEWS_CATEGORIES,
  NewsCategory,
  uploadNewsPoster,
} from '../services/news';
import { upsertPublishedArticleInCache } from '../utils/newsSessionStorage';

type RootStackParamList = {
  AddNews: undefined;
};

type AddNewsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddNews'>;

type SelectedPoster = {
  uri: string;
  fileName?: string | null;
};

/**
 * Returns today's date in a text-input-friendly format.
 */
const getTodayDate = () => new Date().toISOString().slice(0, 10);

/**
 * Returns the current time in a text-input-friendly format.
 */
const getCurrentTime = () => {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Renders the add-news publishing form used by president users.
 */
export default function AddNewsScreen() {
  const navigation = useNavigation<AddNewsScreenNavigationProp>();

  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [publishDate, setPublishDate] = useState(getTodayDate());
  const [publishTime, setPublishTime] = useState(getCurrentTime());
  const [selectedPoster, setSelectedPoster] = useState<SelectedPoster | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormComplete = useMemo(() => {
    return Boolean(
      title.trim() &&
        intro.trim() &&
        description.trim() &&
        category &&
        selectedPoster?.uri &&
        (publishNow || (publishDate.trim() && publishTime.trim()))
    );
  }, [category, description, intro, publishDate, publishNow, publishTime, selectedPoster, title]);

  const previewCategory = category || 'Category';
  const previewTitle = title.trim() || 'Your headline will appear here';
  const previewIntro =
    intro.trim() || 'A concise introduction helps readers understand the story at a glance.';

  /**
   * Displays the shared toast feedback used across the app.
   */
  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  /**
   * Stores the poster selected from the camera or gallery for preview and upload.
   */
  const handlePosterSelected = (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedPoster({
      uri: asset.uri,
      fileName: asset.fileName ?? null,
    });
  };

  /**
   * Opens the device camera to capture a news poster image.
   */
  const openCamera = async () => {
    setIsSourcePickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      showToast('Camera access is needed to capture a news poster.', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      handlePosterSelected(result.assets[0]);
    }
  };

  /**
   * Opens the device gallery so the publisher can choose a saved poster image.
   */
  const openGallery = async () => {
    setIsSourcePickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      showToast('Gallery access is needed to select a news poster.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      handlePosterSelected(result.assets[0]);
    }
  };

  /**
   * Opens the poster source picker sheet.
   */
  const handleSelectPoster = async () => {
    setIsSourcePickerVisible(true);
  };

  /**
   * Validates and submits a new article, including poster upload and cache refresh.
   */
  const handlePublishPress = async () => {
    if (!isFormComplete) {
      showToast('Fill in all required fields and choose a poster to continue.', 'error');
      return;
    }

    if (!selectedPoster) {
      showToast('Select a news poster before publishing.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const imageUrl = await uploadNewsPoster(selectedPoster.uri, selectedPoster.fileName);
      const publishedAt = publishNow ? undefined : buildPublishedAtIso(publishDate, publishTime);

      const createdArticle = await createNewsArticle({
        title: title.trim(),
        intro: intro.trim(),
        description: description.trim(),
        category: category as Exclude<NewsCategory, 'All'>,
        image_url: imageUrl,
        published_at: publishedAt,
      });

      await upsertPublishedArticleInCache(createdArticle);

      showToast('News article published successfully.', 'success');

      setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error) {
      showToast('Unable to publish this article right now. Please try again.', 'error');
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

      <AppHeader title="Add News" onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.secondaryHeader}>
          <Text style={styles.pageSubtitle}>
            Create a polished update with the right story details, category, and poster preview.
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Story Details</Text>
            <Text style={styles.sectionDescription}>
              These fields map directly to the news content students will read in the app.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>News Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter a clear, compelling headline"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                maxLength={255}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Intro</Text>
              <TextInput
                value={intro}
                onChangeText={setIntro}
                placeholder="Write a short summary for the featured card"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textAreaSm]}
                multiline
                textAlignVertical="top"
                maxLength={220}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add the full story exactly as you want it to appear in the details page"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textAreaLg]}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Publishing</Text>
            <Text style={styles.sectionDescription}>
              Choose the story category and decide whether to publish immediately or schedule it.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>News Category</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={category}
                  onValueChange={(value) => setCategory(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a category" value="" color="#9CA3AF" />
                  {NEWS_CATEGORIES.filter((item) => item !== 'All').map((item) => (
                    <Picker.Item key={item} label={item} value={item} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.publishCard}>
              <View style={styles.publishHeader}>
                <View>
                  <Text style={styles.publishLabel}>Publish Now</Text>
                  <Text style={styles.publishHelp}>
                    When disabled, you can prepare a scheduled publish timestamp.
                  </Text>
                </View>
                <Switch
                  value={publishNow}
                  onValueChange={setPublishNow}
                  trackColor={{ false: '#D1D5DB', true: '#8FD5AE' }}
                  thumbColor={publishNow ? colors.primary : '#F3F4F6'}
                />
              </View>

              {!publishNow && (
                <View style={styles.scheduleGrid}>
                  <View style={styles.scheduleField}>
                    <Text style={styles.fieldLabel}>Publish Date</Text>
                    <TextInput
                      value={publishDate}
                      onChangeText={setPublishDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.scheduleField}>
                    <Text style={styles.fieldLabel}>Publish Time</Text>
                    <TextInput
                      value={publishTime}
                      onChangeText={setPublishTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>News Poster</Text>
            <Text style={styles.sectionDescription}>
              Select a clean portrait image for the featured card and details page.
            </Text>

            <TouchableOpacity style={styles.posterPicker} activeOpacity={0.88} onPress={handleSelectPoster}>
              {selectedPoster ? (
                <>
                  <Image source={{ uri: selectedPoster.uri }} style={styles.posterImage} />
                  <View style={styles.posterOverlay}>
                    <View>
                      <Text style={styles.posterOverlayLabel}>Selected Poster</Text>
                      <Text style={styles.posterFileName} numberOfLines={1}>
                        {selectedPoster.fileName || 'camera-image.jpg'}
                      </Text>
                    </View>
                    <View style={styles.posterActionBadge}>
                      <Ionicons name="images-outline" size={16} color={colors.white} />
                      <Text style={styles.posterActionText}>Change</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.posterPlaceholder}>
                  <View style={styles.posterIconWrap}>
                    <Ionicons name="image-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.posterPlaceholderTitle}>Upload News Poster</Text>
                  <Text style={styles.posterPlaceholderText}>
                    Use the camera or choose an image from the gallery. A live preview will appear here.
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.posterActionsRow}>
              <TouchableOpacity style={styles.secondaryActionButton} onPress={openCamera}>
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryActionText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionButton} onPress={openGallery}>
                <Ionicons name="images-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryActionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Live Preview</Text>
            <Text style={styles.sectionDescription}>
              This preview mirrors the featured hero card on the news screen.
            </Text>

            <View style={styles.previewHeroCard}>
              {selectedPoster ? (
                <Image source={{ uri: selectedPoster.uri }} style={styles.previewHeroImage} />
              ) : (
                <View style={[styles.previewHeroImage, styles.previewHeroImagePlaceholder]}>
                  <Ionicons name="newspaper-outline" size={34} color="#A7B0BA" />
                </View>
              )}

              <LinearGradient
                colors={[
                  'rgba(0,0,0,0)',
                  'rgba(0,0,0,0.35)',
                  'rgba(0,0,0,0.85)',
                  'rgba(0,0,0,0.95)',
                ]}
                locations={[0, 0.4, 0.7, 1]}
                style={styles.previewHeroOverlay}
              >
                <View style={styles.previewHeroCategory}>
                  <Text style={styles.previewHeroCategoryText}>{previewCategory}</Text>
                </View>

                <Text style={styles.previewHeroTitle}>{previewTitle}</Text>

                <Text style={styles.previewHeroDescription} numberOfLines={3}>
                  {previewIntro}
                </Text>

                <View style={styles.previewHeroFooter}>
                  <View style={styles.previewHeroSourceContainer}>
                    <Image source={require('../../assets/featured-logo.png')} style={styles.previewHeroSourceLogo} />
                    <Text style={styles.previewHeroSource}>Lewa News</Text>
                  </View>

                  <Text style={styles.previewHeroTime}>{publishNow ? 'Just now' : 'Scheduled'}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isFormComplete || isSubmitting) && styles.primaryButtonDisabled,
            ]}
            onPress={handlePublishPress}
            activeOpacity={0.88}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons name="radio-outline" size={18} color={colors.white} />
            )}
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Publishing...' : 'Publish News'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isSourcePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSourcePickerVisible(false)}
      >
        <View style={styles.sourcePickerBackdrop}>
          <TouchableOpacity
            style={styles.sourcePickerDismissArea}
            activeOpacity={1}
            onPress={() => setIsSourcePickerVisible(false)}
          />
          <View style={styles.sourcePickerSheet}>
            <View style={styles.sourcePickerHandle} />
            <Text style={styles.sourcePickerTitle}>Choose Poster Source</Text>
            <Text style={styles.sourcePickerSubtitle}>
              Select how you want to attach the news poster.
            </Text>

            <TouchableOpacity style={styles.sourcePickerOption} onPress={openCamera}>
              <View style={styles.sourcePickerIconWrap}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.sourcePickerTextWrap}>
                <Text style={styles.sourcePickerOptionTitle}>Take photo</Text>
                <Text style={styles.sourcePickerOptionDescription}>
                  Capture a fresh poster with your device camera.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sourcePickerOption} onPress={openGallery}>
              <View style={styles.sourcePickerIconWrap}>
                <Ionicons name="images-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.sourcePickerTextWrap}>
                <Text style={styles.sourcePickerOptionTitle}>Choose from gallery</Text>
                <Text style={styles.sourcePickerOptionDescription}>
                  Use an existing image saved on the device.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sourcePickerCancelButton}
              onPress={() => setIsSourcePickerVisible(false)}
            >
              <Text style={styles.sourcePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  secondaryHeaderRow: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 14,
  },
  backText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  pageSubtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textBody,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionDescription: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textBody,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D8E1E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: '#FCFDFD',
  },
  textAreaSm: {
    minHeight: 110,
  },
  textAreaLg: {
    minHeight: 170,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D8E1E8',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FCFDFD',
  },
  picker: {
    color: colors.textPrimary,
  },
  publishCard: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    padding: 16,
  },
  publishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  publishLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  publishHelp: {
    marginTop: 4,
    maxWidth: 230,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textBody,
  },
  scheduleGrid: {
    marginTop: 16,
    gap: 12,
  },
  scheduleField: {
    flex: 1,
  },
  posterPicker: {
    minHeight: 260,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#EFF6F2',
    borderWidth: 1,
    borderColor: '#DCEEE3',
  },
  posterPlaceholder: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 28,
  },
  posterIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 14,
  },
  posterPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  posterPlaceholderText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textBody,
  },
  posterImage: {
    width: '100%',
    height: 320,
    resizeMode: 'cover',
  },
  posterOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  posterOverlayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  posterFileName: {
    marginTop: 4,
    maxWidth: 180,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  posterActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  posterActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  posterActionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E6DB',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  previewHeroCard: {
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewHeroImage: {
    width: '100%',
    height: 350,
    marginTop: -12,
  },
  previewHeroImagePlaceholder: {
    backgroundColor: '#E8EEF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  previewHeroCategory: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  previewHeroCategoryText: {
    fontSize: 12,
    color: colors.white,
  },
  previewHeroTitle: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewHeroDescription: {
    fontSize: 14,
    color: '#eaeced',
    marginBottom: 12,
  },
  previewHeroFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewHeroSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewHeroSourceLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: 0,
  },
  previewHeroSource: {
    color: colors.white,
  },
  previewHeroTime: {
    color: '#D1D5DB',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#0F5C36',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    shadowRadius: 22,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  sourcePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sourcePickerDismissArea: {
    flex: 1,
  },
  sourcePickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sourcePickerHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sourcePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourcePickerSubtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textBody,
  },
  sourcePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5ECF3',
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#FBFCFD',
  },
  sourcePickerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: 12,
  },
  sourcePickerTextWrap: {
    flex: 1,
  },
  sourcePickerOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourcePickerOptionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textBody,
  },
  sourcePickerCancelButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  sourcePickerCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
