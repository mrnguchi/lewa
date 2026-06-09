/**
 * ResourcesScreen Component
 *
 * Displays handouts and past questions with embedded viewing and download actions.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import CustomToast from '../components/CustomToast';
import ResourceCard from '../components/ResourceCard';
import SpinningLoader from '../components/SpinningLoader';
import { colors } from '../theme/colors';
import { downloadResourceFile } from '../services/resources';
import { ResourceItem, ResourceType } from '../types/resources';
import { useResourcesQuery } from '../query/contentQueries';
import { useAndroidNavigationClearance } from '../hooks/useAndroidNavigationClearance';

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
  const isAndroid = Platform.OS === 'android';
  const { contentBottomPadding } = useAndroidNavigationClearance();
  const [activeTab, setActiveTab] = useState<ResourceType>('handout');
  const {
    data: resources = [],
    isPending: isLoading,
    refetch: refetchResources,
  } = useResourcesQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>(EMPTY_FACULTY);
  const [selectedLevel, setSelectedLevel] = useState<string>(EMPTY_LEVEL);
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
   * Refreshes the catalogue when the user pulls the scrollable content down.
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const result = await refetchResources();

      if (result.error) {
        throw result.error;
      }
    } catch {
      showToast('Unable to refresh resources right now.', 'error');
    } finally {
      setIsRefreshing(false);
    }
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

      <FlatList
        data={isLoading ? [] : filteredData}
        keyExtractor={(resource) => resource.id}
        renderItem={({ item }) => (
          <ResourceCard
            meta={getResourceMeta(item)}
            onDownloadPress={handleDownloadPress}
            onPress={handleOpenResource}
            resource={item}
          />
        )}
        numColumns={2}
        columnWrapperStyle={[
          styles.cardsRow,
          isAndroid && styles.androidCardsRow,
        ]}
        style={styles.resourceList}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: isAndroid
              ? contentBottomPadding + 90
              : 122,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={isAndroid}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={[styles.header, isAndroid && styles.androidHeader]}>
              <Text style={[styles.title, isAndroid && styles.androidTitle]}>Resources</Text>
              <Text style={[styles.subtitle, isAndroid && styles.androidSubtitle]}>
                Find handouts and past questions for your courses.
              </Text>

              <View style={[styles.searchContainer, isAndroid && styles.androidSearchContainer]}>
                <Ionicons name="search" size={isAndroid ? 18 : 20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, isAndroid && styles.androidSearchInput]}
                  placeholder="Search by course code or title"
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={[styles.filterButton, isAndroid && styles.androidFilterButton]}
                  onPress={() => setShowFilterModal(true)}
                >
                  <MaterialCommunityIcons name="filter-variant" size={isAndroid ? 21 : 24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.tabsContainer, isAndroid && styles.androidTabsContainer]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  isAndroid && styles.androidTab,
                  activeTab === 'handout' && styles.tabActive,
                ]}
                onPress={() => setActiveTab('handout')}
              >
                <Text
                  style={[
                    styles.tabText,
                    isAndroid && styles.androidTabText,
                    activeTab === 'handout' && styles.tabTextActive,
                  ]}
                >
                  Handouts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  isAndroid && styles.androidTab,
                  activeTab === 'pastQuestion' && styles.tabActive,
                ]}
                onPress={() => setActiveTab('pastQuestion')}
              >
                <Text
                  style={[
                    styles.tabText,
                    isAndroid && styles.androidTabText,
                    activeTab === 'pastQuestion' && styles.tabTextActive,
                  ]}
                >
                  Past questions
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={[styles.loaderSection, isAndroid && styles.androidLoaderSection]}>
              <SpinningLoader size={isAndroid ? 64 : 76} />
              <Text style={[styles.loaderText, isAndroid && styles.androidLoaderText]}>
                Loading your resources...
              </Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={[styles.emptyState, isAndroid && styles.androidEmptyState]}>
              <Ionicons name="document-text-outline" size={isAndroid ? 36 : 42} color={colors.primary} />
              <Text style={[styles.emptyTitle, isAndroid && styles.androidEmptyTitle]}>
                No resources found
              </Text>
              <Text style={[styles.emptyText, isAndroid && styles.androidEmptyText]}>
                Try a different search term or reset the current filters.
              </Text>
            </View>
          ) : null
        }
      />

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
          <TouchableOpacity activeOpacity={1} style={[styles.filterModal, isAndroid && styles.androidFilterModal]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, isAndroid && styles.androidFilterTitle]}>
                Filters
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={isAndroid ? 21 : 24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterModalScroll}
              contentContainerStyle={[styles.filterModalBody, isAndroid && styles.androidFilterModalBody]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, isAndroid && styles.androidFilterLabel]}>
                  Faculty
                </Text>
                <View style={[styles.filterOptions, isAndroid && styles.androidFilterOptions]}>
                  {faculties.map((faculty) => (
                    <TouchableOpacity
                      key={faculty}
                      style={[
                        styles.filterChip,
                        isAndroid && styles.androidFilterChip,
                        selectedFaculty === faculty && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedFaculty(faculty)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isAndroid && styles.androidFilterChipText,
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
                <Text style={[styles.filterLabel, isAndroid && styles.androidFilterLabel]}>
                  Level
                </Text>
                <View style={[styles.filterOptions, isAndroid && styles.androidFilterOptions]}>
                  {levels.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.filterChip,
                        isAndroid && styles.androidFilterChip,
                        selectedLevel === level && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedLevel(level)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isAndroid && styles.androidFilterChipText,
                          selectedLevel === level && styles.filterChipTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.filterActions, isAndroid && styles.androidFilterActions]}>
              <TouchableOpacity
                style={[styles.secondaryButton, isAndroid && styles.androidFilterActionButton]}
                onPress={handleResetFilters}
              >
                <Text style={[styles.secondaryButtonText, isAndroid && styles.androidFilterActionText]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, isAndroid && styles.androidFilterActionButton]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.primaryButtonText, isAndroid && styles.androidFilterActionText]}>
                  Apply
                </Text>
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
    backgroundColor: colors.background,
  },
  resourceList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  androidHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  androidTitle: {
    fontSize: 22,
    lineHeight: 29,
  },
  subtitle: {
    marginTop: 3,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  androidSubtitle: {
    marginBottom: 12,
    fontSize: 11.5,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 62,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  androidSearchContainer: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0,
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
  androidSearchInput: {
    fontSize: 13,
    paddingVertical: 2,
  },
  filterButton: {
    padding: 4,
  },
  androidFilterButton: {
    padding: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 5,
    borderRadius: 10,
    backgroundColor: '#E9EEF2',
  },
  androidTabsContainer: {
    marginHorizontal: 16,
    gap: 4,
    marginBottom: 14,
    padding: 4,
    borderRadius: 9,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
  },
  androidTab: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  androidTabText: {
    fontSize: 12.5,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  loaderSection: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 18,
  },
  androidLoaderSection: {
    paddingTop: 64,
    gap: 14,
  },
  loaderText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  androidLoaderText: {
    fontSize: 12.5,
  },
  emptyState: {
    paddingHorizontal: 32,
    paddingTop: 56,
    alignItems: 'center',
    gap: 10,
  },
  androidEmptyState: {
    paddingHorizontal: 26,
    paddingTop: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  androidEmptyTitle: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  androidEmptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardsRow: {
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  androidCardsRow: {
    paddingHorizontal: 16,
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
    maxHeight: '82%',
  },
  androidFilterModal: {
    borderRadius: 20,
    padding: 16,
    maxHeight: '78%',
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
  androidFilterTitle: {
    fontSize: 16,
  },
  filterModalScroll: {
    flexGrow: 0,
  },
  filterModalBody: {
    paddingBottom: 2,
  },
  androidFilterModalBody: {
    paddingBottom: 0,
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
  androidFilterLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  androidFilterOptions: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  androidFilterChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#4B5563',
  },
  androidFilterChipText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  androidFilterActions: {
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidFilterActionButton: {
    minHeight: 44,
    borderRadius: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
  },
  androidFilterActionText: {
    fontSize: 12.5,
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
