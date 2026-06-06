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
  Platform,
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

import AppHeader from '../components/AppHeader';
import ResourceCard from '../components/ResourceCard';
import { CURRENT_ACADEMIC_YEAR_LABEL } from '../constants/payment';
import { useAuth } from '../hooks/useAuth';
import {
  fetchLatestNewsArticles,
  formatNewsPublishedDate,
  formatNewsRelativeTime,
  NewsArticle,
} from '../services/news';
import { downloadResourceFile, getResources } from '../services/resources';
import { showErrorToast, showSuccessToast } from '../services/toast';
import { colors } from '../theme/colors';
import { ResourceItem } from '../types/resources';
import { getCachedNewsArticles } from '../utils/newsSessionStorage';

type RootStackParamList = {
  MainTabs: { screen?: string };
  FeeSelection: undefined;
  PaymentMethod: { paymentType: string; amount: number };
  Receipts: undefined;
  SupportDesk: undefined;
  AddResource: undefined;
  NewsDetails: { news: NewsArticle };
  ResourceViewer: { resource: ResourceItem };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HOME_NEWS_LIMIT = 4;
const HOME_RESOURCE_LIMIT = 4;

/**
 * Renders the authenticated home dashboard and latest news summary section.
 */
export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isLoading: authLoading } = useAuth();
  const isAndroid = Platform.OS === 'android';

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [latestNewsArticles, setLatestNewsArticles] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [homeResources, setHomeResources] = useState<ResourceItem[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(true);

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

  /**
   * Loads the newest four resources for the compact home preview.
   */
  const refreshHomeResources = useCallback(async () => {
    try {
      const latestResources = await getResources({ limit: HOME_RESOURCE_LIMIT });
      setHomeResources(latestResources.slice(0, HOME_RESOURCE_LIMIT));
    } finally {
      setIsResourcesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCachedLatestNews().catch(() => undefined);
      refreshLatestNews().catch(() => undefined);
      refreshHomeResources().catch(() => undefined);
    }, [loadCachedLatestNews, refreshHomeResources, refreshLatestNews])
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
   * Opens the full resources tab from the home preview.
   */
  const handleViewResourcesPress = () => {
    navigation.navigate('MainTabs', { screen: 'Resources' });
  };

  /**
   * Opens a single news article from the home dashboard preview.
   */
  const handleOpenNews = (news: NewsArticle) => {
    navigation.navigate('NewsDetails', { news });
  };

  /**
   * Opens a resource document and leaves the home screen in the stack for swipe-back.
   */
  const handleOpenResource = (resource: ResourceItem) => {
    navigation.navigate('ResourceViewer', { resource });
  };

  /**
   * Downloads a resource from the home preview using the same action as the resources tab.
   */
  const handleDownloadResource = async (resource: ResourceItem) => {
    try {
      await downloadResourceFile(resource);
      showSuccessToast('Resource ready to save or share.');
    } catch {
      showErrorToast('Unable to download this resource right now.');
    }
  };

  /**
   * Returns the resource subtitle displayed on each card.
   */
  const getResourceMeta = (resource: ResourceItem) => {
    const facultyLabel = resource.faculty?.trim() || 'Faculty not specified';
    return `${facultyLabel} • Level ${resource.level}`;
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
      <AppHeader variant="home" greeting={getGreeting()} name={getFirstName()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isAndroid && styles.androidScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchSection, isAndroid && styles.androidSearchSection]}>
          <View style={[styles.searchContainer, isAndroid && styles.androidSearchContainer]}>
            <Ionicons
              name="search"
              size={isAndroid ? 18 : 20}
              color="#9CA3AF"
              style={[styles.searchIcon, isAndroid && styles.androidSearchIcon]}
            />
            <TextInput
              style={[styles.searchInput, isAndroid && styles.androidSearchInput]}
              placeholder="Search updates, calendar, resources..."
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={[styles.searchFilterButton, isAndroid && styles.androidSearchFilterButton]}
              activeOpacity={0.82}
            >
              <Image
                source={require('../../assets/filter-icon-new.png')}
                style={[styles.searchFilterIcon, isAndroid && styles.androidSearchFilterIcon]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bodyContent}>
          <View style={[styles.profileCard, isAndroid && styles.androidProfileCard]}>
            <ImageBackground
              source={require('../../assets/profile-card-bg.jpg')}
              style={styles.profileCardBackground}
              imageStyle={styles.profileCardImage}
              resizeMode="cover"
            >
                <View style={[styles.profileCardOverlay, isAndroid && styles.androidProfileCardOverlay]}>
                <View style={styles.profileTopSection}>
                  <View style={styles.schoolBrandRow}>
                    <View style={styles.schoolLogoContainer}>
                      <Image
                        source={require('../../assets/UB-logo-1.jpg')}
                        style={styles.schoolLogo}
                      />
                    </View>

                    <View style={styles.schoolCopy}>
                      <Text style={styles.schoolName}>University of Buea</Text>
                    </View>
                  </View>

                  <View style={styles.levelBadge}>
                    <Ionicons name="trending-up" size={12} color={colors.white} />
                    <Text style={styles.levelBadgeText}>Lv {user.level}</Text>
                  </View>
                </View>

                <View style={styles.studentInfoSection}>
                  <View style={styles.studentInfoRow}>
                    <View style={styles.studentInfoBlock}>
                      <Text style={styles.studentInfoLabel}>Student</Text>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {user.full_name}
                      </Text>
                    </View>

                    <View style={styles.studentInfoBlockRight}>
                      <Text style={styles.studentInfoLabel}>Matricule</Text>
                      <Text style={styles.studentInfoValue} numberOfLines={1} adjustsFontSizeToFit>
                        {user.matricule}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentInfoRow}>
                    <View style={styles.studentInfoBlock}>
                      <Text style={styles.studentInfoLabel}>Faculty</Text>
                      <Text style={styles.studentInfoValue} numberOfLines={1}>
                        {user.faculty}
                      </Text>
                    </View>

                    <View style={styles.studentInfoBlockRight}>
                      <Text style={styles.studentInfoLabel}>Fee Status</Text>
                      <Text
                        style={[
                          styles.studentInfoValue,
                          user.fee_status === 'PAID' ? styles.paidText : styles.pendingText,
                        ]}
                      >
                        {getFeeStatusDisplay()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.schoolYearSection}>
                  <Text style={styles.schoolYearLabel}>School Year</Text>
                  <Text style={styles.schoolYearValue}>{CURRENT_ACADEMIC_YEAR_LABEL}</Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={[styles.ctaRow, isAndroid && styles.androidCtaRow]}>
            <TouchableOpacity
              style={[styles.ctaButton, isAndroid && styles.androidCtaButton]}
              onPress={handlePayFeesPress}
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.ctaIconBubble,
                  styles.payFeesIconBubble,
                  isAndroid && styles.androidCtaIconBubble,
                ]}
              >
                <Image
                  source={require('../../assets/pay-fees.png')}
                  style={[styles.ctaIcon, styles.payFeesIcon, isAndroid && styles.androidCtaIcon]}
                />
              </View>
              <Text
                style={[styles.ctaText, styles.payFeesText, isAndroid && styles.androidCtaText]}
                numberOfLines={2}
              >
                Pay Fees
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, isAndroid && styles.androidCtaButton]}
              onPress={() => navigation.navigate('Receipts')}
              activeOpacity={0.82}
            >
              <View style={[styles.ctaIconBubble, isAndroid && styles.androidCtaIconBubble]}>
                <Image
                  source={require('../../assets/receipt-icon-new.png')}
                  style={[styles.ctaIcon, isAndroid && styles.androidCtaIcon]}
                />
              </View>
              <Text style={[styles.ctaText, isAndroid && styles.androidCtaText]} numberOfLines={2}>
                My Receipts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, isAndroid && styles.androidCtaButton]}
              onPress={() => navigation.navigate('SupportDesk')}
              activeOpacity={0.82}
            >
              <View style={[styles.ctaIconBubble, isAndroid && styles.androidCtaIconBubble]}>
                <Image
                  source={require('../../assets/help-desk-new.png')}
                  style={[styles.ctaIcon, isAndroid && styles.androidCtaIcon]}
                />
              </View>
              <Text style={[styles.ctaText, isAndroid && styles.androidCtaText]} numberOfLines={2}>
                Help Desk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, isAndroid && styles.androidCtaButton]}
              onPress={() => navigation.navigate('AddResource')}
              activeOpacity={0.82}
            >
              <View style={[styles.ctaIconBubble, isAndroid && styles.androidCtaIconBubble]}>
                <Image
                  source={require('../../assets/add-resource-icon-new.png')}
                  style={[styles.ctaIcon, isAndroid && styles.androidCtaIcon]}
                />
              </View>
              <Text style={[styles.ctaText, isAndroid && styles.androidCtaText]} numberOfLines={2}>
                Add Resource
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, isAndroid && styles.androidSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.newsSliderContent,
                isAndroid && styles.androidNewsSliderContent,
              ]}
              style={[styles.newsSlider, isAndroid && styles.androidNewsSlider]}
            >
              {latestNewsArticles.map((news) => (
                <TouchableOpacity
                  key={news.id}
                  style={[styles.newsCard, isAndroid && styles.androidNewsCard]}
                  activeOpacity={0.88}
                  onPress={() => handleOpenNews(news)}
                >
                  <View style={styles.newsImageWrap}>
                    <Image source={{ uri: news.image_url }} style={styles.newsImage} resizeMode="cover" />
                    <View style={styles.newsImageAction}>
                      <Ionicons name="bookmark-outline" size={15} color={colors.primary} />
                    </View>
                  </View>

                  <View style={styles.newsMetaRow}>
                    <Text style={styles.newsCategory} numberOfLines={1}>
                      {news.category}
                    </Text>
                    <Text style={styles.newsSourceText}>Lewa news</Text>
                  </View>

                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {news.title}
                  </Text>

                  <Text style={styles.newsIntro} numberOfLines={2}>
                    {news.intro}
                  </Text>

                  <View style={styles.newsFooter}>
                    <View style={styles.newsDateRow}>
                      <Ionicons name="time-outline" size={12} color={colors.textBody} />
                      <Text style={styles.newsTimeAgo} numberOfLines={1}>
                        {formatNewsRelativeTime(news.published_at)}
                      </Text>
                    </View>

                    <Text style={styles.newsDate} numberOfLines={1}>
                      {formatNewsPublishedDate(news.published_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.newsStateContainer, isAndroid && styles.androidSoftSurface]}>
              <Text style={styles.newsStateText}>No news articles available right now.</Text>
            </View>
          )}
          </View>

          <View style={[styles.section, isAndroid && styles.androidSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Resources</Text>
              </View>
              <TouchableOpacity onPress={handleViewResourcesPress}>
                <Text style={styles.viewAllText}>View more</Text>
              </TouchableOpacity>
            </View>

            {isResourcesLoading ? (
              <View style={[styles.resourceStateContainer, isAndroid && styles.androidSoftSurface]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : homeResources.length ? (
              <View style={styles.resourceCardsGrid}>
                {homeResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    meta={getResourceMeta(resource)}
                    onDownloadPress={handleDownloadResource}
                    onPress={handleOpenResource}
                    resource={resource}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.resourceStateContainer, isAndroid && styles.androidSoftSurface]}>
                <Text style={styles.newsStateText}>No resources available right now.</Text>
              </View>
            )}
          </View>
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
          <View style={[styles.toastContent, isAndroid && styles.androidToastContent]}>
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 118,
  },
  androidScrollContent: {
    paddingBottom: 140,
  },
  bodyContent: {
    backgroundColor: colors.background,
    overflow: 'visible',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  androidSearchSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  androidSearchContainer: {
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  androidSearchIcon: {
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  androidSearchInput: {
    fontSize: 13.5,
  },
  searchFilterButton: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  androidSearchFilterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 6,
  },
  searchFilterIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: colors.white,
  },
  androidSearchFilterIcon: {
    width: 18,
    height: 18,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 2,
  },
  androidProfileCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.35)',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  profileCardBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
  },
  profileCardImage: {
    borderRadius: 20,
    opacity: 0.45,
  },
  profileCardOverlay: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(31, 41, 51, 0.86)',
  },
  androidProfileCardOverlay: {
    padding: 16,
  },
  profileTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 16,
  },
  schoolBrandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolLogoContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  schoolLogo: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  schoolCopy: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  studentInfoSection: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  studentInfoBlock: {
    flex: 1,
  },
  studentInfoBlockRight: {
    flex: 0.9,
    alignItems: 'flex-end',
  },
  studentName: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
    lineHeight: 24,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  studentInfoLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.62)',
    marginBottom: 3,
  },
  studentInfoValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
    lineHeight: 18,
  },
  paidText: {
    color: colors.primary,
  },
  pendingText: {
    color: '#FDE68A',
  },
  schoolYearSection: {
    paddingTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schoolYearLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.68)',
  },
  schoolYearValue: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 10,
  },
  androidCtaRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  ctaButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  androidCtaButton: {
    gap: 6,
  },
  ctaIconBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F2F4F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidCtaIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  payFeesIconBubble: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ctaIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  androidCtaIcon: {
    width: 27,
    height: 27,
  },
  payFeesIcon: {
    tintColor: colors.white,
  },
  ctaText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  androidCtaText: {
    fontSize: 10.3,
    lineHeight: 13,
  },
  payFeesText: {
    color: colors.primary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  androidSection: {
    paddingHorizontal: 16,
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
  resourceCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resourceStateContainer: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 14,
  },
  androidSoftSurface: {
    borderWidth: 1,
    borderColor: '#EEF2F5',
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
  newsSlider: {
    marginHorizontal: -20,
  },
  androidNewsSlider: {
    marginHorizontal: -16,
  },
  newsSliderContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  androidNewsSliderContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  newsCard: {
    width: 168,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  androidNewsCard: {
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 3,
    elevation: 0,
  },
  newsImageWrap: {
    width: '100%',
    height: 112,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.background,
    position: 'relative',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsImageAction: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsMetaRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  newsCategory: {
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  newsSourceText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textBody,
  },
  newsTitle: {
    minHeight: 40,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  newsIntro: {
    minHeight: 32,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 5,
  },
  newsDateRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsTimeAgo: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  newsDate: {
    maxWidth: 70,
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
    textAlign: 'right',
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
  androidToastContent: {
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
    lineHeight: 20,
  },
});
