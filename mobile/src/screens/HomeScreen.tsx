import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import { useAuth } from '../hooks/useAuth';
import {
  fetchLatestNewsArticles,
  formatNewsPublishedDate,
  formatNewsRelativeTime,
  NewsArticle,
} from '../services/news';
import { showSuccessToast } from '../services/toast';
import { colors } from '../theme/colors';
import { getCachedNewsArticles } from '../utils/newsSessionStorage';

type RootStackParamList = {
  MainTabs: { screen?: string };
  FeeSelection: undefined;
  PaymentMethod: { paymentType: string; amount: number };
  Receipts: undefined;
  SupportDesk: undefined;
  NewsDetails: { news: NewsArticle };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HOME_NEWS_LIMIT = 4;

/**
 * Renders the authenticated home dashboard and latest news summary section.
 */
export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isLoading: authLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [latestNewsArticles, setLatestNewsArticles] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));

  /**
   * Gets the appropriate greeting for the current time of day.
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Extracts the student's first name for a friendlier greeting.
   */
  const getFirstName = () => {
    if (!user?.full_name) return 'Student';
    return user.full_name.split(' ')[0];
  };

  /**
   * Formats the student's fee status into a user-facing label.
   */
  const getFeeStatusDisplay = () => {
    if (!user?.fee_status) return 'Not Paid';
    if (user.fee_status === 'PAID') return 'Paid';
    if (user.fee_status === 'PARTIAL') return 'Partial';
    return 'Not Paid';
  };

  /**
   * Displays the existing subscription warning toast.
   */
  const showToast = () => {
    setToastVisible(true);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 2000);
  };

  /**
   * Loads cached latest news first so the home feed feels responsive on revisit.
   */
  const loadCachedLatestNews = useCallback(async () => {
    const cachedArticles = await getCachedNewsArticles();

    if (cachedArticles.length) {
      setLatestNewsArticles(cachedArticles.slice(0, HOME_NEWS_LIMIT));
      setIsNewsLoading(false);
    }
  }, []);

  /**
   * Refreshes the home news preview from the backend and limits it to four articles.
   */
  const refreshLatestNews = useCallback(async () => {
    try {
      const latestArticles = await fetchLatestNewsArticles(HOME_NEWS_LIMIT);
      setLatestNewsArticles(latestArticles.slice(0, HOME_NEWS_LIMIT));
    } finally {
      setIsNewsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCachedLatestNews().catch(() => undefined);
      refreshLatestNews().catch(() => undefined);
    }, [loadCachedLatestNews, refreshLatestNews])
  );

  /**
   * Handles navigation into the fee payment flow.
   */
  const handlePayFeesPress = () => {
    if (user?.fee_status === 'PAID') {
      showSuccessToast("You've completed fees for this school year.");
      return;
    }

    if (!user?.subscribed) {
      showToast();
      setTimeout(() => {
        navigation.navigate('PaymentMethod', {
          paymentType: 'subscription',
          amount: 10,
        });
      }, 2000);
    } else {
      navigation.navigate('FeeSelection');
    }
  };

  /**
   * Opens the full Lewa News tab when the user asks to view all articles.
   */
  const handleViewAllPress = () => {
    navigation.navigate('MainTabs', { screen: 'Lewa News' });
  };

  /**
   * Opens a single news article from the home dashboard preview.
   */
  const handleOpenNews = (news: NewsArticle) => {
    navigation.navigate('NewsDetails', { news });
  };

  if (!fontsLoaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontFamily: 'Poppins_400Regular', color: colors.textPrimary }}>
          No user data available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/upper-section-bg1.jpg')}
          style={styles.heroSection}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(11, 22, 38, 0.88)', 'rgba(12, 45, 68, 0.78)', 'rgba(12, 45, 68, 0.1)']}
            style={styles.heroOverlay}
          >
            <AppHeader variant="hero" />

            <View style={styles.header}>
              <View style={styles.greetingSection}>
                <Text style={styles.subGreeting}>{getGreeting()}</Text>
                <Text style={styles.greeting}>{getFirstName()}</Text>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search updates, UB calendar, resources..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.bodyContent}>
          <View style={styles.profileCard}>
            <ImageBackground
              source={require('../../assets/profile-card-bg.jpg')}
              style={styles.profileCardImage}
              imageStyle={styles.profileCardImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  'rgba(12, 27, 38, 0.78)',
                  'rgba(19, 18, 18, 0.58)',
                  'rgba(10, 18, 26, 0.84)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientOverlay}
              >
                <Text style={styles.studentName} numberOfLines={1}>
                  {user.full_name.toUpperCase()}
                </Text>

                <View style={styles.levelBadge}>
                  <Ionicons name="trending-up" size={12} color={colors.success} />
                  <Text style={styles.levelBadgeText}>Lv {user.level}</Text>
                </View>

                <Text style={styles.matriculeNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {user.matricule}
                </Text>

                <View style={styles.facultyFeeRow}>
                  <View style={styles.facultyContainer}>
                    <Ionicons name="school" size={14} color={colors.success} />
                    <Text style={styles.facultyText} numberOfLines={1}>
                      {user.faculty}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.feeStatusBadge,
                      user.fee_status === 'PAID' ? styles.feeStatusPaid : styles.feeStatusNotPaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.feeStatusText,
                        user.fee_status !== 'PAID' && styles.feeStatusTextNotPaid,
                      ]}
                    >
                      {getFeeStatusDisplay()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardActionButton} onPress={handlePayFeesPress}>
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
            </ImageBackground>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionIconContainer}>
                  <MaterialCommunityIcons name="bullhorn" size={20} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Latest News</Text>
              </View>
              <TouchableOpacity onPress={handleViewAllPress}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>

          {isNewsLoading ? (
            <View style={styles.newsStateContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : latestNewsArticles.length ? (
            latestNewsArticles.map((news) => (
              <TouchableOpacity
                key={news.id}
                style={styles.newsCard}
                activeOpacity={0.5}
                onPress={() => handleOpenNews(news)}
              >
                <Image source={{ uri: news.image_url }} style={styles.newsImage} resizeMode="cover" />

                <View style={styles.newsContent}>
                  <Text style={styles.newsDate}>{formatNewsPublishedDate(news.published_at)}</Text>

                  <Text style={styles.newsTitle}>{news.title}</Text>

                  <View style={styles.newsFooter}>
                    <Text style={styles.newsTimeAgo}>
                      {formatNewsRelativeTime(news.published_at)}
                    </Text>

                    <Text style={styles.lewaNews}>Lewa News</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.newsStateContainer}>
              <Text style={styles.newsStateText}>No news articles available right now.</Text>
            </View>
          )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons name="alert-circle" size={20} color={colors.white} />
            <Text style={styles.toastText}>
              You haven't subscribed yet. Please subscribe to pay fees.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    backgroundColor: '#0B1626',
    flex: 1,
  },
  heroSection: {
    overflow: 'hidden',
  },
  heroImage: {},
  heroOverlay: {
    paddingBottom: 132,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 0,
  },
  greetingSection: {
    marginBottom: 0,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
    lineHeight: 34,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.72)',
    marginBottom: 2,
  },
  bodyContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -36,
    overflow: 'visible',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 30,
    marginTop: 16,
    paddingBottom: 10,
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
    marginTop: -70,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },
  profileCardImage: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileCardImageStyle: {
    borderRadius: 20,
  },
  gradientOverlay: {
    borderRadius: 20,
    padding: 24,
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.68)',
    marginBottom: 8,
    paddingRight: 82,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 10,
  },
  facultyText: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  feeStatusBadge: {
    flexShrink: 0,
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
  newsStateContainer: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 14,
  },
  newsStateText: {
    fontSize: 14,
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
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
    lineHeight: 20,
  },
});
