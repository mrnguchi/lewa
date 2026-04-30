/**
 * ResourcesScreen Component
 *
 * Displays handouts and past questions with embedded viewing and download actions.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import CustomToast from '../components/CustomToast';
import SpinningLoader from '../components/SpinningLoader';
import { colors } from '../theme/colors';
import { downloadResourceFile, getResources } from '../services/resources';
import { ResourceItem, ResourceType } from '../types/resources';

type RootStackParamList = {
  ResourceViewer: {
    resource: ResourceItem;
  };
  AddResource: undefined;
};

type ResourcesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResourceViewer'>;

const EMPTY_FACULTY = 'All';
const EMPTY_LEVEL = 'All';

/**
 * Renders the resources catalogue with search, filters, PDF viewing, and downloads.
 */
const ResourcesScreen: React.FC = () => {
  const navigation = useNavigation<ResourcesScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<ResourceType>('handout');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>(EMPTY_FACULTY);
  const [selectedLevel, setSelectedLevel] = useState<string>(EMPTY_LEVEL);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const currentData = useMemo(() => {
    return resources.filter((resource) => resource.type === activeTab);
  }, [activeTab, resources]);

  const filteredData = useMemo(() => {
    return currentData.filter((resource) => {
      const searchValue = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        resource.code.toLowerCase().includes(searchValue) ||
        resource.title.toLowerCase().includes(searchValue) ||
        (resource.description?.toLowerCase().includes(searchValue) ?? false);
      const matchesFaculty =
        selectedFaculty === EMPTY_FACULTY || resource.faculty === selectedFaculty;
      const matchesLevel =
        selectedLevel === EMPTY_LEVEL || `${resource.level}` === selectedLevel;

      return matchesSearch && matchesFaculty && matchesLevel;
    });
  }, [currentData, searchQuery, selectedFaculty, selectedLevel]);

  const faculties = useMemo(() => {
    const values = currentData
      .map((resource) => resource.faculty)
      .filter((faculty): faculty is string => Boolean(faculty));

    return [EMPTY_FACULTY, ...Array.from(new Set(values))];
  }, [currentData]);

  const levels = useMemo(() => {
    const values = Array.from(new Set(currentData.map((resource) => `${resource.level}`))).sort();
    return [EMPTY_LEVEL, ...values];
  }, [currentData]);

  /**
   * Displays the shared in-app toast used for resource feedback.
   */
  const showToast = (message: string, typeValue: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(typeValue);
    setToastVisible(true);
  };

  /**
   * Fetches the latest resource list from the backend.
   */
  const loadResources = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const payload = await getResources();
      setResources(payload);
    } catch (error) {
      showToast('Unable to load resources right now.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadResources();
    }, [loadResources])
  );

  /**
   * Refreshes the catalogue when the user pulls the scrollable content down.
   */
  const handleRefresh = async () => {
    await loadResources(true);
  };

  /**
   * Resets the active resource filters back to their default values.
   */
  const handleResetFilters = () => {
    setSelectedFaculty(EMPTY_FACULTY);
    setSelectedLevel(EMPTY_LEVEL);
  };

  /**
   * Opens the selected PDF inside the embedded resource viewer.
   */
  const handleOpenResource = (resource: ResourceItem) => {
    navigation.navigate('ResourceViewer', { resource });
  };

  /**
   * Downloads the selected resource file and opens the share sheet when possible.
   */
  const handleDownloadPress = async (resource: ResourceItem) => {
    try {
      await downloadResourceFile(resource);
      showToast('Resource ready to save or share.', 'success');
    } catch (error) {
      showToast('Unable to download this resource right now.', 'error');
    }
  };

  /**
   * Returns the resource subtitle displayed on each card.
   */
  const getResourceMeta = (resource: ResourceItem) => {
    const facultyLabel = resource.faculty?.trim() || 'Faculty not specified';
    return `${facultyLabel} • Level ${resource.level}`;
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Handouts{'\n'}& past questions</Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Resources"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <MaterialCommunityIcons name="filter-variant" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'handout' && styles.tabActive]}
            onPress={() => setActiveTab('handout')}
          >
            <Text style={[styles.tabText, activeTab === 'handout' && styles.tabTextActive]}>
              Handouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pastQuestion' && styles.tabActive]}
            onPress={() => setActiveTab('pastQuestion')}
          >
            <Text style={[styles.tabText, activeTab === 'pastQuestion' && styles.tabTextActive]}>
              Past questions
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderSection}>
            <SpinningLoader size={76} />
            <Text style={styles.loaderText}>Loading your resources...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={42} color={colors.primary} />
            <Text style={styles.emptyTitle}>No resources found</Text>
            <Text style={styles.emptyText}>
              Try a different search term or reset the current filters.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredData.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => handleOpenResource(resource)}
              >
                <Image
                  source={require('../../assets/pdf-icon.png')}
                  style={styles.pdfIcon}
                />

                <Text style={styles.cardCode}>{resource.code}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {resource.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {getResourceMeta(resource)}
                </Text>

                <TouchableOpacity
                  style={styles.downloadButton}
                  activeOpacity={0.92}
                  onPress={() => handleDownloadPress(resource)}
                >
                  <Text style={styles.downloadButtonText}>Download</Text>
                  <MaterialCommunityIcons name="download-network" size={18} color={colors.white} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Faculty</Text>
              <View style={styles.filterOptions}>
                {faculties.map((faculty) => (
                  <TouchableOpacity
                    key={faculty}
                    style={[
                      styles.filterChip,
                      selectedFaculty === faculty && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFaculty(faculty)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedFaculty === faculty && styles.filterChipTextActive,
                      ]}
                    >
                      {faculty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Level</Text>
              <View style={styles.filterOptions}>
                {levels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterChip,
                      selectedLevel === level && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedLevel(level)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedLevel === level && styles.filterChipTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleResetFilters}>
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.primaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 62,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  filterButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
    marginTop: -10,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  tabTextActive: {
    color: colors.white,
  },
  loaderSection: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 18,
  },
  loaderText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  emptyState: {
    paddingHorizontal: 32,
    paddingTop: 56,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  cardsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfIcon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 1,
    alignSelf: 'center',
  },
  cardCode: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginBottom: 12,
  },
  downloadButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  filterModal: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  filterSection: {
    marginBottom: 18,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});

export default ResourcesScreen;
