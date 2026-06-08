import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AppHeader from '../components/AppHeader';
import CustomToast from '../components/CustomToast';
import SpinningLoader from '../components/SpinningLoader';
import { colors } from '../theme/colors';
import {
  formatNewsPublishedDate,
  formatNewsRelativeTime,
  NEWS_CATEGORIES,
  NewsArticle,
} from '../services/news';
import { useLatestNewsQuery } from '../query/contentQueries';

type RootStackParamList = {
  MainTabs: { screen: string };
  NewsDetails: { news: NewsArticle };
};

type UpdatesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Renders the Lewa News feed with live backend data and pull-to-refresh support.
 */
export default function UpdatesScreen() {
  const navigation = useNavigation<UpdatesScreenNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const {
    data: articles = [],
    isPending: isInitialLoading,
    refetch: refetchNews,
  } = useLatestNewsQuery();
  const [selectedCategory, setSelectedCategory] = useState<(typeof NEWS_CATEGORIES)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleNewsCount, setVisibleNewsCount] = useState(4);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  /**
   * Displays the shared toast feedback used across the app.
   */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  /**
   * Refreshes the news feed when the user pulls down on the scrollable content.
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const result = await refetchNews();

      if (result.error) {
        throw result.error;
      }

      showToast('News feed updated with the latest articles.', 'success');
    } catch {
      showToast('Unable to refresh Lewa News right now.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchNews, showToast]);

  /**
   * Updates the search query and resets the visible list window.
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setVisibleNewsCount(4);
  }, []);

  /**
   * Updates the active category filter and resets the visible list window.
   */
  const handleCategoryChange = useCallback((category: (typeof NEWS_CATEGORIES)[number]) => {
    setSelectedCategory(category);
    setVisibleNewsCount(4);
  }, []);

  /**
   * Loads more filtered articles into the visible news list.
   */
  const handleLoadMore = useCallback(() => {
    setVisibleNewsCount((previousCount) => previousCount + 4);
  }, []);

  const featuredNews = articles[0] ?? null;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const otherNews = useMemo(() => {
    const feedArticles = articles.slice(1);

    return feedArticles.filter((article) => {
      const matchesCategory =
        selectedCategory === 'All' || article.category === selectedCategory;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      const searchSource = `${article.title} ${article.intro} ${article.description} ${article.category}`.toLowerCase();
      return matchesCategory && searchSource.includes(normalizedQuery);
    });
  }, [articles, normalizedQuery, selectedCategory]);

  const visibleNews = otherNews.slice(0, visibleNewsCount);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <CustomToast
          message={toastMessage}
          type={toastType}
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
        />
        <AppHeader />
        <View style={styles.loaderContainer}>
          <SpinningLoader size={88} />
          <Text style={[styles.loaderText, isAndroid && styles.loaderTextAndroid]}>
            Loading the latest Lewa updates...
          </Text>
        </View>
      </View>
    );
  }

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.searchContainer, isAndroid && styles.searchContainerAndroid]}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search news..."
            placeholderTextColor="#9CA3AF"
            style={[styles.searchInput, isAndroid && styles.searchInputAndroid]}
          />
        </View>

        {featuredNews ? (
          <TouchableOpacity
            style={[styles.featuredCard, isAndroid && styles.featuredCardAndroid]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('NewsDetails', { news: featuredNews })}
          >
            <Image
              source={{ uri: featuredNews.image_url }}
              style={[styles.featuredImage, isAndroid && styles.featuredImageAndroid]}
            />

            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.35)',
                'rgba(0,0,0,0.85)',
                'rgba(0,0,0,0.95)',
              ]}
              locations={[0, 0.4, 0.7, 1]}
              style={[styles.featuredOverlay, isAndroid && styles.featuredOverlayAndroid]}
            >
              <View style={styles.featuredCategory}>
                <Text style={styles.featuredCategoryText}>{featuredNews.category}</Text>
              </View>

              <Text style={[styles.featuredTitle, isAndroid && styles.featuredTitleAndroid]}>
                {featuredNews.title}
              </Text>

              <Text
                style={[
                  styles.featuredDescription,
                  isAndroid && styles.featuredDescriptionAndroid,
                ]}
                numberOfLines={3}
              >
                {featuredNews.intro}
              </Text>

              <View style={styles.featuredFooter}>
                <View style={styles.featuredSourceContainer}>
                  <Image
                    source={require('../../assets/featured-logo.png')}
                    style={styles.sourceLogo}
                  />
                  <Text style={styles.featuredSource}>Lewa News</Text>
                </View>

                <Text style={styles.featuredTime}>
                  {formatNewsRelativeTime(featuredNews.published_at)}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No published news yet</Text>
            <Text style={styles.emptyStateText}>
              Pull down on this feed to check again when new articles are available.
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryContainer, isAndroid && styles.categoryContainerAndroid]}
        >
          {NEWS_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                isAndroid && styles.categoryChipAndroid,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChange(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  isAndroid && styles.categoryTextAndroid,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.newsContainer, isAndroid && styles.newsContainerAndroid]}>
          {visibleNews.length ? (
            visibleNews.map((news) => (
              <TouchableOpacity
                key={news.id}
                style={[styles.newsCard, isAndroid && styles.newsCardAndroid]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('NewsDetails', { news })}
              >
                <Image
                  source={{ uri: news.image_url }}
                  style={[styles.newsImage, isAndroid && styles.newsImageAndroid]}
                />

                <View style={styles.newsContent}>
                  <Text style={styles.newsDate}>
                    {formatNewsPublishedDate(news.published_at)}
                  </Text>

                  <Text style={[styles.newsTitle, isAndroid && styles.newsTitleAndroid]}>
                    {news.title}
                  </Text>

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
            <View style={styles.filteredEmptyState}>
              <Text style={styles.filteredEmptyTitle}>No matching articles</Text>
              <Text style={styles.filteredEmptyText}>
                Try a different category or clear your search to see more updates.
              </Text>
            </View>
          )}
        </View>

        {visibleNewsCount < otherNews.length && (
          <TouchableOpacity
            style={[styles.loadMoreButton, isAndroid && styles.loadMoreButtonAndroid]}
            onPress={handleLoadMore}
          >
            <Text style={[styles.loadMoreText, isAndroid && styles.loadMoreTextAndroid]}>
              Load More
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.bottomSpacer, isAndroid && styles.bottomSpacerAndroid]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loaderText: {
    marginTop: 18,
    fontSize: 15,
    color: colors.textBody,
    textAlign: 'center',
  },
  loaderTextAndroid: {
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Android news cards use tighter media and near-flat shadows for a cleaner feed.
  searchContainerAndroid: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowOpacity: 0.015,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchInputAndroid: {
    fontSize: 14,
  },
  featuredCard: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredCardAndroid: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 14,
  },
  featuredImage: {
    width: '100%',
    height: 350,
    marginTop: -12,
  },
  featuredImageAndroid: {
    height: 280,
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredOverlayAndroid: {
    padding: 16,
  },
  featuredCategory: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  featuredCategoryText: {
    color: colors.white,
    fontSize: 12,
  },
  featuredTitle: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  featuredTitleAndroid: {
    fontSize: 17,
    marginBottom: 6,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#eaeced',
    marginBottom: 12,
  },
  featuredDescriptionAndroid: {
    fontSize: 12.5,
    marginBottom: 8,
  },
  featuredFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredSource: {
    color: colors.white,
  },
  featuredTime: {
    color: '#D1D5DB',
  },
  sourceLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: 0,
  },
  emptyStateCard: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textBody,
  },
  categoryContainer: {
    marginTop: 20,
    paddingLeft: 20,
  },
  categoryContainerAndroid: {
    marginTop: 16,
    paddingLeft: 16,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  categoryChipAndroid: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1F2937',
  },
  categoryText: {
    color: '#374151',
  },
  categoryTextAndroid: {
    fontSize: 12.5,
  },
  categoryTextActive: {
    color: colors.white,
  },
  newsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  newsContainerAndroid: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  newsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  newsCardAndroid: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  newsImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  newsImageAndroid: {
    width: 88,
    height: 88,
    borderRadius: 10,
    marginRight: 10,
  },
  newsContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  newsDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    marginTop: 8,
  },
  newsTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: -28,
  },
  newsTitleAndroid: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: -22,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTimeAgo: {
    fontSize: 12,
    color: '#6B7280',
  },
  lewaNews: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '400',
  },
  filteredEmptyState: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  filteredEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filteredEmptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textBody,
  },
  loadMoreButton: {
    backgroundColor: '#1F2937',
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadMoreButtonAndroid: {
    marginHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  loadMoreText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreTextAndroid: {
    fontSize: 13,
  },
  bottomSpacer: {
    height: 120,
  },
  bottomSpacerAndroid: {
    height: 128,
  },
});
