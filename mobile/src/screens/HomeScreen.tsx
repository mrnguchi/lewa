
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';

type RootStackParamList = {
  MainTabs: { screen: string };
  FeeSelection: undefined;
  Receipts: undefined;
  SupportDesk: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data for Latest News (will later come from API)

const newsData = [
  {
    id: 1,
    title: 'Students conference 4th edition',
    category: 'Events',
    date: 'Sunday - Feb 8th',
    timeAgo: '5 days ago',
    image: require('../../assets/update-2.jpg'),
    lewaLogo: require('../../assets/icon-1.png'),
  },
  {
    id: 2,
    title: 'New AI research lab opens at UB',
    category: 'Tech',
    date: 'Wednesday - Feb 5th',
    timeAgo: '1 week ago',
    image: require('../../assets/update-3.jpg'),
    lewaLogo: require('../../assets/icon-1.png'),
  },
  {
    id: 3,
    title: 'Cameroon innovative health hackathon',
    category: 'Sports',
    date: 'Monday - Feb 3rd',
    timeAgo: '2 weeks ago',
    image: require('../../assets/update-4.jpg'),
    lewaLogo: require('../../assets/icon-1.png'),
  },
];



// Mock user data (will be replaced with actual user data from backend)
const userData = {
  name: 'MUNOH NGUCHI',
  level: 'Lv 400',
  matricule: 'CT24A456',
  faculty: 'COLLEGE OF TECHNOLOGY',
  department: 'Computer Engineering',
  feeStatus: 'Not Paid', // 'Paid' or 'Not Paid'
  registered: true,
  profileImage: require('../../assets/my-profile-ph.jpg'), // Placeholder profile image
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>

    {/* App Header with Profile Modal */}
    <AppHeader />

    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>


        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hello, Munoh!</Text>
          <Text style={styles.subGreeting}>{getGreeting()} !</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search updates, UB calendar, resources..."
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#1F2933', '#2D3748']}
            style={styles.gradientOverlay}
          >
            {/* Student Name */}
            <Text style={styles.studentName}>{userData.name}</Text>

            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Ionicons name="trending-up" size={12} color={colors.success} />
              <Text style={styles.levelBadgeText}>{userData.level}</Text>
            </View>

            {/* Matricule Number (Large) */}
            <Text style={styles.matriculeNumber}>{userData.matricule}</Text>

            {/* Faculty and Fee Status Row */}
            <View style={styles.facultyFeeRow}>
              <View style={styles.facultyContainer}>
                <Ionicons name="school" size={14} color={colors.success} />
                <Text style={styles.facultyText}>{userData.faculty}</Text>
              </View>
              <View style={[styles.feeStatusBadge, userData.feeStatus === 'Paid' ? styles.feeStatusPaid : styles.feeStatusNotPaid]}>
                <Text style={[styles.feeStatusText, userData.feeStatus !== 'Paid' && styles.feeStatusTextNotPaid]}>{userData.feeStatus}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Quick Action Buttons */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={() => navigation.navigate('FeeSelection' as never)}
              >
                <Image
                  source={require('../../assets/pay-fees.png')}
                  style={styles.cardActionIcon}
                />
                <Text style={styles.cardActionText}>Pay Fees</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={() => navigation.navigate('Receipts')}
              >
                <Image
                  source={require('../../assets/my-receipts.png')}
                  style={styles.cardActionIcon}
                />
                <Text style={styles.cardActionText}>My Receipts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={() => navigation.navigate('SupportDesk')}
              >
                <Image
                  source={require('../../assets/helpdesk.png')}
                  style={styles.cardActionIcon}
                />
                <Text style={styles.cardActionText}>Help Desk</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* UB Calendar Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="bullhorn" size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Latest News</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* News Cards */}
          
          {newsData.map((news) => (
          <TouchableOpacity
            key={news.id}
            style={styles.newsCard}
            activeOpacity={0.5}
            onPress={() => {
              console.log('Open news:', news.title);
              // later you will navigate here
              // navigation.navigate('NewsDetails', { news })
            }}
          >

            {/* Left Image */}
            <Image
              source={news.image}
              style={styles.newsImage}
              resizeMode="cover"
            />

            {/* Content */}
            <View style={styles.newsContent}>

              <Text style={styles.newsDate}>
                {news.date}
              </Text>

              <Text style={styles.newsTitle}>
                {news.title}
              </Text>

              {/* Footer */}
              <View style={styles.newsFooter}>

                <Text style={styles.newsTimeAgo}>
                  {news.timeAgo}
                </Text>

                {/* Category Icon */}
                <Text style={styles.lewaNews}>
                  Lewa News
                </Text>

              </View>

            </View>

          </TouchableOpacity>
        ))}
        </View>


        {/* Bottom padding for AppBar */}
        <View style={{ height: 100 }} />
      </ScrollView>

    </View>
  );
}


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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  greetingSection: {
    marginBottom: 25,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  subGreeting: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  profileCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gradientOverlay: {
    borderRadius: 20,
    padding: 24,
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  levelBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    gap: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.success,
  },
  matriculeNumber: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
    marginBottom: 8,
    letterSpacing: 1,
  },
  facultyFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  facultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facultyText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#9CA3AF',
  },
  feeStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 5,
  },
  feeStatusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  feeStatusNotPaid: {
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
  },
  feeStatusText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.success,
  },
  feeStatusTextNotPaid: {
    color: '#EF4444',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  cardActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardActionIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  cardActionText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  calendarDate: {
    width: 75,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  calendarDateToday: {
    backgroundColor: colors.primary,
  },
  calendarDay: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6B7280',
  },
  calendarDayToday: {
    color: colors.white,
  },
  calendarDateNumber: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  calendarDateNumberToday: {
    color: colors.white,
  },
  calendarContent: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarMonth: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
  },
  viewMoreText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  newsIndicator: {
    width: 4,
    height: 40,
    backgroundColor: colors.border1,
    borderRadius: 2,
    marginRight: 12,
  },
  newsIndicatorFirst: {
    backgroundColor: colors.primary,
  },
  // newsContent: {
  //   flex: 1,
  // },
  // newsTitle: {
  //   fontSize: 14,
  //   fontFamily: 'Poppins_600SemiBold',
  //   color: colors.textPrimary,
  //   marginBottom: 4,
  // },
  newsTimestamp: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
  },


  newsCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.white,
  borderRadius: 15,
  paddingHorizontal: 10,
  paddingVertical: 14,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 4,
},

newsImage: {
  width: 90,
  height: 95,
  borderRadius: 12,
  marginRight: 14,
  backgroundColor: colors.background,
},

newsContent: {
  flex: 1,
},

newsDate: {
  fontSize: 12,
  fontFamily: 'Poppins_400Regular',
  color: '#9CA3AF',
  marginBottom: 4,
},

newsTitle: {
  fontSize: 15,
  fontFamily: 'Poppins_600SemiBold',
  color: colors.textPrimary,
  marginBottom: 6,
},

newsTimeAgo: {
  fontSize: 12,
  fontFamily: 'Poppins_400Regular',
  color: '#9CA3AF',
},

newsCategoryCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.white,
  justifyContent: 'center',
  alignItems: 'center',
},
newsFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 18,
},

lewaNews: {
  color: colors.primary,
  fontSize: 12,
  fontFamily: 'Poppins_500Medium',
},
});