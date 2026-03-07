import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

type RootStackParamList = {
  MainTabs: { screen: string };
  NewsDetails: { news: any };
};

type NewsDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewsDetails'>;
type NewsDetailsScreenRouteProp = RouteProp<RootStackParamList, 'NewsDetails'>;

export default function NewsDetailsScreen() {
  const navigation = useNavigation<NewsDetailsScreenNavigationProp>();
  const route = useRoute<NewsDetailsScreenRouteProp>();
  const { news } = route.params;

  return (
    <View style={styles.container}>

      {/* App Header with Profile Modal */}
      <AppHeader />

      {/* Back Button and Title */}
      <View style={styles.header}>
                {/* Back Button and Title */}
                <View style={styles.titleSection}>
                  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2933" />
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageTitle}>News details</Text>
                </View>
              </View>

      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Image */}
        
          <View style={styles.heroImageContainer}>
            <Image
            source={news.image}
            style={styles.heroImage}
          />
          </View>
        

        {/* Content */}
        <View style={styles.contentContainer}>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{news.category}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{news.title}</Text>

          {/* Date and Time */}
          <View style={styles.metaContainer}>
            <Text style={styles.date}>{news.date}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.timeAgo}>{news.timeAgo}</Text>
          </View>

          {/* Source */}
          <View style={styles.sourceContainer}>
            <Image
              source={require('../../assets/featured-logo.png')}
              style={styles.sourceLogo}
            />
            <Text style={styles.sourceText}>Lewa News</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{news.description}</Text>

        </View>

        <View style={{ height: 40 }} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },



  // Back button and title header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.white,
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
    fontFamily: 'Poppins_700Medium',
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
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,  
    backgroundColor:'#e9e9e9',
    borderRadius: 12,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  

  heroImage: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    resizeMode: 'cover',
    
  },

  contentContainer: {
    padding: 20,
  },

  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    alignSelf: 'flex-start',
    marginBottom: 12,
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  sourceLogo: {
    width: 32,
    height: 30,
    borderRadius: 16,
    backgroundColor: colors.primary,
    marginRight: 8,
  },

  sourceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  description: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textBody,
  },
});