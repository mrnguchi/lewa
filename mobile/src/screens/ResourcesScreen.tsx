/**
 * ResourcesScreen Component
 *
 * Resources tab screen with handouts and past questions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';


// Navigation types
type RootStackParamList = {
  ResourceDetails: {
    resource: {
      id: string;
      code: string;
      title: string;
      price?: string;
      faculty: string;
      level: number;
      isUBRequirement: boolean;
    };
    type: 'handout' | 'pastQuestion';
  };
};

type ResourcesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResourceDetails'>;

// Resource type
interface Resource {
  id: string;
  code: string;
  title: string;
  price?: string;
  faculty: string;
  level: number;
  isUBRequirement: boolean;
}

// Mock data for handouts (all have prices)
const handoutsData: Resource[] = [
  { id: '1', code: 'ENG101', title: 'Use of English I', price: '1000 XAF', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '2', code: 'ENG102', title: 'Use of English II', price: '1000 XAF', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '3', code: 'CO321', title: 'Programming with UML', price: '1250 XAF', faculty: 'College of Technology', level: 300, isUBRequirement: false },
  { id: '4', code: 'CO322', title: 'Data Structures', price: '1250 XAF', faculty: 'College of Technology', level: 300, isUBRequirement: false },
  { id: '5', code: 'FRE101', title: 'French Language I', price: '1000 XAF', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '6', code: 'LAW100', title: 'Introduction to Law', price: '1000 XAF', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '7', code: 'EN421', title: 'Engineering Design', price: '1500 XAF', faculty: 'Engineering', level: 400, isUBRequirement: false },
  { id: '8', code: 'EN422', title: 'Project Management', price: '1500 XAF', faculty: 'Engineering', level: 400, isUBRequirement: false },
];

// Mock data for past questions (no prices)
const pastQuestionsData: Resource[] = [
  { id: '1', code: 'ENG100', title: 'Use of English', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '2', code: 'ENT100', title: 'Entrepreneurship', faculty: 'UB Requirement', level: 100, isUBRequirement: true },
  { id: '3', code: 'CO221', title: 'Database Systems', faculty: 'College of Technology', level: 200, isUBRequirement: false },
  { id: '4', code: 'CO222', title: 'Web Development', faculty: 'College of Technology', level: 200, isUBRequirement: false },
  { id: '5', code: 'EN321', title: 'Thermodynamics', faculty: 'Engineering', level: 300, isUBRequirement: false },
  { id: '6', code: 'EN322', title: 'Fluid Mechanics', faculty: 'Engineering', level: 300, isUBRequirement: false },
  { id: '7', code: 'SC241', title: 'Organic Chemistry', faculty: 'Science', level: 200, isUBRequirement: false },
  { id: '8', code: 'SC242', title: 'Physics Lab', faculty: 'Science', level: 200, isUBRequirement: false },
];

const ResourcesScreen: React.FC = () => {
  const navigation = useNavigation<ResourcesScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'handouts' | 'pastQuestions'>('handouts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedUBRequirement, setSelectedUBRequirement] = useState<string>('All');

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Get current data based on active tab
  const currentData = activeTab === 'handouts' ? handoutsData : pastQuestionsData;

  // Filter data based on search and filters
  const filteredData = currentData.filter((resource) => {
    const matchesSearch = resource.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaculty = selectedFaculty === 'All' || resource.faculty === selectedFaculty;
    const matchesLevel = selectedLevel === 'All' || resource.level.toString() === selectedLevel;
    const matchesUBRequirement = selectedUBRequirement === 'All' ||
                                (selectedUBRequirement === 'Yes' && resource.isUBRequirement) ||
                                (selectedUBRequirement === 'No' && !resource.isUBRequirement);

    return matchesSearch && matchesFaculty && matchesLevel && matchesUBRequirement;
  });

  // Get unique faculties for filter
  const faculties = ['All', ...Array.from(new Set(currentData.map(r => r.faculty)))];
  const levels = ['All', '100', '200', '300', '400'];
  const ubRequirements = ['All', 'Yes', 'No'];

  const handleResetFilters = () => {
    setSelectedFaculty('All');
    setSelectedLevel('All');
    setSelectedUBRequirement('All');
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleOpenResource = (resource: Resource) => {
    navigation.navigate('ResourceDetails', {
      resource,
      type: activeTab === 'handouts' ? 'handout' : 'pastQuestion',
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      {/* Header */}
      <View style={styles.header}>

        <Text style={styles.title}>Handouts{'\n'}& past questions</Text>

        {/* Search Bar */}
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
            <MaterialCommunityIcons name="filter-variant" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'handouts' && styles.tabActive]}
          onPress={() => setActiveTab('handouts')}
        >
          <Text style={[styles.tabText, activeTab === 'handouts' && styles.tabTextActive]}>
            Handouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pastQuestions' && styles.tabActive]}
          onPress={() => setActiveTab('pastQuestions')}
        >
          <Text style={[styles.tabText, activeTab === 'pastQuestions' && styles.tabTextActive]}>
            Past questions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Cards Section */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsGrid}>
          {filteredData.map((resource) => (
            <View key={resource.id} style={styles.card}>
              <Image
                source={require('../../assets/pdf-icon.png')}
                style={styles.pdfIcon}
              />

              {/* Course code with price (for handouts) */}
              {activeTab === 'handouts' ? (
                <View style={styles.cardHeader}>
                  <Text style={styles.cardCode}>{resource.code}</Text>
                  <Text style={styles.cardCodeDot}> • </Text>
                  <Text style={styles.cardPrice}>{resource.price}</Text>
                </View>
              ) : (
                <Text style={styles.cardCode}>{resource.code}</Text>
              )}

              <Text style={styles.cardTitle}>{resource.title}</Text>

              {/* Footer with buttons - same layout for both tabs */}
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.downloadButton}>
                  <MaterialCommunityIcons name="download-network" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenResource(resource)}
                >
                  <Text style={styles.openButtonText}>Open</Text>
                  <MaterialIcons name="open-in-new" size={14} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModal}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Faculty Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Faculty</Text>
                <View style={styles.filterOptions}>
                  {faculties.map((faculty) => (
                    <TouchableOpacity
                      key={faculty}
                      style={[
                        styles.filterOption,
                        selectedFaculty === faculty && styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedFaculty(faculty)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedFaculty === faculty && styles.filterOptionTextActive,
                        ]}
                      >
                        {faculty}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Level Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Level</Text>
                <View style={styles.filterOptions}>
                  {levels.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.filterOption,
                        selectedLevel === level && styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedLevel(level)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedLevel === level && styles.filterOptionTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* UB Requirement Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>UB Requirement</Text>
                <View style={styles.filterOptions}>
                  {ubRequirements.map((req) => (
                    <TouchableOpacity
                      key={req}
                      style={[
                        styles.filterOption,
                        selectedUBRequirement === req && styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedUBRequirement(req)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedUBRequirement === req && styles.filterOptionTextActive,
                        ]}
                      >
                        {req}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter Actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetFilters}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApplyFilters}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  translationButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: colors.textPrimary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 20,
    lineHeight: 36,
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
  filterIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  cardsGrid: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  cardCodeDot: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  cardPrice: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.gold,
  },
  downloadButton: {
    width: 72,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: colors.textPrimary,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 13,
    gap: 4,
  },
  openButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  externalLinkIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: colors.white,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});

export default ResourcesScreen;