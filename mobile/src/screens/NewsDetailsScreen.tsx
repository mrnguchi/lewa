import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import { colors } from '../theme/colors';
import { resetToMainTab } from '../navigation/resetNavigation';
import {
  fetchNewsArticleById,
  formatNewsPublishedDate,
  formatNewsRelativeTime,
  NewsArticle,
} from '../services/news';

type RootStackParamList = {
  MainTabs: { screen: string };
  NewsDetails:
    | {
        news: NewsArticle;
      }
    | {
        newsId: string;
      };
};

type NewsDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NewsDetails'
>;
type NewsDetailsScreenRouteProp = RouteProp<RootStackParamList, 'NewsDetails'>;

/**
 * Renders a single news article using the live backend payload.
 */
export default function NewsDetailsScreen() {
  const navigation = useNavigation<NewsDetailsScreenNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const route = useRoute<NewsDetailsScreenRouteProp>();
  const routeNews = 'news' in route.params ? route.params.news : null;
  const routeNewsId = 'newsId' in route.params ? route.params.newsId : routeNews?.id ?? null;
  const [news, setNews] = useState<NewsArticle | null>(routeNews);
  const [isLoading, setIsLoading] = useState(!routeNews && Boolean(routeNewsId));
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loads the article when this screen is opened from a notification using only its id.
  useEffect(() => {
    if (routeNews) {
      setNews(routeNews);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    if (!routeNewsId) {
      setIsLoading(false);
      setLoadError('This article could not be found.');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    fetchNewsArticleById(routeNewsId)
      .then((article) => {
        if (!isMounted) {
          return;
        }

        setNews(article);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setLoadError('Could not load this article right now.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [routeNews, routeNewsId]);

  // Returns to the news feed when there is no back stack available.
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    resetToMainTab(navigation, 'Lewa News');
  };

  const articleMeta = useMemo(() => {
    if (!news) {
      return null;
    }

    return {
      publishedDate: formatNewsPublishedDate(news.published_at),
      relativeTime: formatNewsRelativeTime(news.published_at),
    };
  }, [news]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="News details" onBackPress={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.feedbackText}>Loading article...</Text>
        </View>
      </View>
    );
  }

  if (!news) {
    return (
      <View style={styles.container}>
        <AppHeader title="News details" onBackPress={handleBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.feedbackErrorText}>{loadError ?? 'This article could not be found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Back to Lewa News</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="News details" onBackPress={handleBack} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroImageContainer,
            isAndroid && styles.heroImageContainerAndroid,
          ]}
        >
          <Image
            source={{ uri: news.image_url }}
            style={[styles.heroImage, isAndroid && styles.heroImageAndroid]}
          />
        </View>

        <View style={[styles.contentContainer, isAndroid && styles.contentContainerAndroid]}>
          <View style={[styles.categoryBadge, isAndroid && styles.categoryBadgeAndroid]}>
            <Text style={styles.categoryText}>{news.category}</Text>
          </View>

          <Text style={[styles.title, isAndroid && styles.titleAndroid]}>{news.title}</Text>

          <View style={styles.metaContainer}>
            <Text style={styles.date}>{articleMeta?.publishedDate}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.timeAgo}>{articleMeta?.relativeTime}</Text>
          </View>

          <View style={styles.sourceContainer}>
            <Image
              source={require('../../assets/featured-logo.png')}
              style={styles.sourceLogo}
            />
            <Text style={styles.sourceText}>Lewa News</Text>
          </View>

          <Text style={[styles.description, isAndroid && styles.descriptionAndroid]}>
            {news.description}
          </Text>
        </View>

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textBody,
    textAlign: 'center',
  },
  feedbackErrorText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  header: {
    paddingHorizontal: 20,
    marginTop: -15,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    position: 'relative',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
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
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '500',
  },
  heroImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 15,
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Android article media is shorter and uses a very mild card shadow.
  heroImageContainerAndroid: {
    marginTop: 14,
    marginBottom: 12,
    width: '92%',
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  heroImage: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  heroImageAndroid: {
    height: 280,
    borderRadius: 10,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerAndroid: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryBadgeAndroid: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  categoryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '400',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 32,
  },
  titleAndroid: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  separator: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  timeAgo: {
    fontSize: 14,
    color: '#6B7280',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sourceLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  description: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  descriptionAndroid: {
    fontSize: 13,
    lineHeight: 21,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomSpacerAndroid: {
    height: 28,
  },
});
