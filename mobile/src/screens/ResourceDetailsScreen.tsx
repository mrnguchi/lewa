/**
 * ResourceDetailsScreen Component
 * 
 * Screen for viewing resource details (handouts and past questions)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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

type ResourceDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ResourceDetails'>;
type ResourceDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResourceDetails'>;

const ResourceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ResourceDetailsScreenNavigationProp>();
  const route = useRoute<ResourceDetailsScreenRouteProp>();
  const { resource, type } = route.params;

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

  // Mock description
  const description = `UML (Unified Modeling Language) is an industry-standard general-purpose modeling language used to visualize, specify, construct, and document software systems.`;

  return (
    <View style={styles.container}>
      <AppHeader />
      {/* Header */}
      <View style={styles.header}>
        

        {/* Back button and title */}
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>
            {type === 'handout' ? 'Handout details' : 'Past question details'}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* PDF Icon */}
        <Image
          source={require('../../assets/pdf-icon.png')}
          style={styles.pdfIcon}
        />

        {/* Resource Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.courseCode}>{resource.code}</Text>
            {resource.price && (
              <Text style={styles.price}>{resource.price}</Text>
            )}
          </View>

          <Text style={styles.courseTitle}>{resource.title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.downloadButton}>
              <MaterialCommunityIcons name="download-network" size={18} color={colors.textPrimary} />
              <Text style={styles.downloadButtonText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.openButton}>
              <Text style={styles.openButtonText}>Open</Text>
              <MaterialIcons name="open-in-new" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
 
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
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
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pdfIcon: {
    width: 350,
    height: 350,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  price: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.gold,
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  downloadIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: colors.textPrimary,
  },
  downloadButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 12,

  },
  openButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  externalLinkIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: colors.white,
  },
});

export default ResourceDetailsScreen;

