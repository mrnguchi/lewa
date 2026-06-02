/**
 * EventDetailsScreen Component
 *
 * Displays detailed information about a calendar event
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';

// Navigation types
type RootStackParamList = {
  EventDetails: {
    event: {
      id: string;
      title: string;
      date: string;
      description: string;
      status: 'upcoming' | 'past';
      time?: string;
    };
    indicatorColor: string;
  };
};

type EventDetailsRouteProp = RouteProp<RootStackParamList, 'EventDetails'>;
type EventDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EventDetailsScreen: React.FC = () => {
  const navigation = useNavigation<EventDetailsNavigationProp>();
  const route = useRoute<EventDetailsRouteProp>();
  const { event, indicatorColor } = route.params;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Format the date
  const eventDate = new Date(event.date);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const formattedDate = `${months[eventDate.getMonth()].slice(0, 4)} ${eventDate.getDate()}, ${eventDate.getFullYear()}`;
  const timeRange = event.time || '10:00 am to 02:00 pm';

  return (
    <View style={styles.container}>
      {/* Header */}
        <AppHeader />

        {/* Back Button and Title */}
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Item Details</Text>
        </View>
      

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Date and Time Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.badgeText}>{formattedDate}</Text>
            </View>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.badgeText}>{timeRange}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{event.status}</Text>
              </View>
            </View>

            {/* Description Content with Timeline */}
            <View style={styles.descriptionContent}>
              <View style={styles.timeline}>
                <View style={[styles.timelineDot, { backgroundColor: indicatorColor }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.descriptionTextContainer}>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
  translationText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  profileButton: {
    width: 48,
    height: 48,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  content: {
    paddingHorizontal: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 24,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  descriptionContent: {
    flexDirection: 'row',
    gap: 16,
  },
  timeline: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 3,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    minHeight: 100,
  },
  descriptionTextContainer: {
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    lineHeight: 24,
  },
});

export default EventDetailsScreen;

