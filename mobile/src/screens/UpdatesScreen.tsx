import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../components/AppHeader';

type RootStackParamList = {
  MainTabs: { screen: string };
  NewsDetails: { news: any };
};

type UpdatesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;


/*
================================
MOCK NEWS DATA
================================
*/
const newsData = [
  {
    id: 1,
    title: 'Master AI & Automation in 5 Days',
    intro: 'Hello techies, tired of repetitive tasks eating up your day? Its time to build systems that work for you.',
    description:
      'Hello techies, tired of repetitive tasks eating up your day? Its time to build systems that work for you.Join us for an intensive 5-day workshop where you will learn to automate your workflow, build intelligent systems, and leverage AI tools to boost your productivity. This hands-on program covers everything from basic automation scripts to advanced AI integration.What you will learn• Python automation fundamentals• AI-powered workflow optimization• Building custom automation tools• Integration with popular AI APIs• Real-world project implementationWhether you are a student, developer, or tech enthusiast, this workshop will transform how you work. Limited spots available - register now to secure your place in this game-changing program.',
    category: 'Tech',
    date: 'Sunday - Feb 8th',
    timeAgo: '4 hours ago',
    image: require('../../assets/update-1.jpg'),
  },
  {
    id: 2,
    title: 'Students conference 4th edition',
    intro: 'The 4th edition of the UB students conference brings together innovators, researchers, and students.',
    description:
      'The 4th edition of the UB students conference brings together innovators, researchers, and students to present groundbreaking ideas and collaborative projects.This year\'s conference promises to be the biggest yet, featuring keynote speakers from leading tech companies, interactive workshops, and networking sessions with industry professionals. Students from various faculties will showcase their research projects, innovative solutions, and entrepreneurial ventures.Highlights include:• 50+ student presentations• Panel discussions with industry leaders• Startup pitch competition• Networking opportunities• Awards for best projectsThe conference aims to foster innovation, collaboration, and knowledge sharing among the student community. Dont miss this opportunity to connect with like-minded individuals and showcase your work.',
    category: 'Events',
    date: 'Sunday - Feb 8th',
    timeAgo: '5 days ago',
    image: require('../../assets/update-2.jpg'),
  },
  {
    id: 3,
    title: 'New AI research lab opens at UB',
    intro: 'The University of Buea has launched a new artificial intelligence research laboratory.',
    description:
      'The University of Buea has launched a new artificial intelligence research laboratory aimed at advancing machine learning innovation and student research opportunities.The state-of-the-art facility is equipped with high-performance computing resources, GPU clusters, and the latest AI development tools. Students and faculty members will have access to cutting-edge technology for conducting research in machine learning, computer vision, natural language processing, and robotics.The lab will focus on:• AI research and development• Student training programs• Industry collaboration projects• Innovation in African contexts• Publishing research papersThis initiative positions UB as a leading institution in AI research in Central Africa and opens up new opportunities for students interested in artificial intelligence and machine learning careers.',
    category: 'Tech',
    date: 'Wednesday - Feb 5th',
    timeAgo: '1 week ago',
    image: require('../../assets/update-3.jpg'),
  },
  {
    id: 4,
    title: 'Cameroon innovative health hackathon',
    intro: 'Students and developers gathered to build innovative health technology solutions.',
    description:
      'Students and developers gathered to build innovative health technology solutions addressing real healthcare challenges across Cameroon.The 48-hour hackathon brought together over 100 participants including medical students, software developers, designers, and healthcare professionals. Teams worked around the clock to develop mobile apps, web platforms, and IoT solutions targeting critical health issues.Winning projects included:• Telemedicine platform for rural areas• AI-powered disease diagnosis tool• Maternal health monitoring system• Medicine delivery tracking app• Health records management solutionThe event was sponsored by leading tech companies and healthcare organizations committed to improving healthcare access through technology. Top teams received funding and mentorship to further develop their solutions.',
    category: 'Events',
    date: 'Monday - Feb 3rd',
    timeAgo: '2 weeks ago',
    image: require('../../assets/update-4.jpg'),
  },
  {
    id: 5,
    title: 'UB football team qualifies for finals',
    intro: 'The University of Buea football team secured a dramatic semifinal victory.',
    description:
      'The University of Buea football team secured a dramatic semifinal victory to qualify for the national university championship finals.In a thrilling match that went into extra time, UB defeated their rivals 3-2 with a stunning last-minute goal. The team showed exceptional skill, determination, and teamwork throughout the tournament, winning all their group stage matches and knockout rounds.Key highlights:• Unbeaten run in the tournament• Top scorer with 12 goals• Best defensive record• Strong team chemistry• Excellent coaching strategyThe finals will be held next month at the national stadium. The entire UB community is rallying behind the team as they aim to bring home the championship trophy. This would be UB\'s first national title in five years.',
    category: 'Sports',
    date: 'Tuesday - Feb 1st',
    timeAgo: '2 weeks ago',
    image: require('../../assets/update-5.jpg'),
  },
  {
    id: 6,
    title: 'Business incubation hub launched',
    intro: 'A new business incubation hub has been launched at UB to support student entrepreneurs.',
    description:
      'A new business incubation hub has been launched at UB to support student entrepreneurs, startups, and innovative business ideas.The hub provides a collaborative workspace, mentorship programs, funding opportunities, and access to business development resources. Student entrepreneurs can receive guidance from experienced business leaders, connect with potential investors, and develop their ventures in a supportive environment.Services offered:• Free co-working space• Business mentorship• Seed funding opportunities• Legal and accounting support• Networking events• Pitch training workshopsThe incubation hub aims to foster an entrepreneurial culture on campus and help students transform their innovative ideas into successful businesses. Applications are now open for the first cohort of startups.',
    category: 'Business',
    date: 'Thursday - Jan 28th',
    timeAgo: '3 weeks ago',
    image: require('../../assets/update-5.jpg'),
  },
];

/*
================================
CATEGORIES
================================
*/
const categories = ['All', 'Tech', 'Business', 'Sports', 'Events'];



export default function UpdatesScreen() {
  const navigation = useNavigation<UpdatesScreenNavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleNewsCount, setVisibleNewsCount] = useState(4);



  /*
  
  FILTER NEWS BY CATEGORY
  
  */

  const filteredNews =
    selectedCategory === 'All'
      ? newsData
      : newsData.filter((news) => news.category === selectedCategory);



  const featuredNews = filteredNews[0];
  const otherNews = filteredNews.slice(1, visibleNewsCount + 1);



  return (
    <View style={styles.container}>

      {/* App Header with Profile Modal */}
      <AppHeader />



      <ScrollView showsVerticalScrollIndicator={false}>



        {/*SEARCH BAR*/}

        <View style={styles.searchContainer}>

          <Ionicons name="search" size={20} color="#9CA3AF" />

          <TextInput
            placeholder="Search news..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />

        </View>



        {/* 
        FEATURED NEWS
         */}

        {featuredNews && (

          <TouchableOpacity
            style={styles.featuredCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('NewsDetails', { news: featuredNews })}
          >

            <Image
              source={featuredNews.image}
              style={styles.featuredImage}
            />

            <LinearGradient
            colors={[
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.35)',
              'rgba(0,0,0,0.85)',
              'rgba(0,0,0,0.95)'
            ]}
            locations={[0, 0.4, 0.7, 1]}
            style={styles.featuredOverlay}
          >

              <View style={styles.featuredCategory}>
                <Text style={styles.featuredCategoryText}>
                  {featuredNews.category}
                </Text>
              </View>

              <Text style={styles.featuredTitle}>
                {featuredNews.title}
              </Text>

              <Text style={styles.featuredDescription}>
                {featuredNews.intro}
              </Text>

              <View style={styles.featuredFooter}>
                <View style={styles.featuredSourceContainer}>
                  <Image source={require('../../assets/featured-logo.png')} style={styles.sourceLogo} />
                  <Text style={styles.featuredSource}>
                  Lewa News
                </Text>
                </View>

                <Text style={styles.featuredTime}>
                  {featuredNews.timeAgo}
                </Text>
              </View>

            </LinearGradient>

          </TouchableOpacity>

        )}



        {/*CATEGORY CHIPS*/}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
        >

          {categories.map((category) => (

            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >

              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>

            </TouchableOpacity>

          ))}

        </ScrollView>



        {/* 
        NEWS LIST
         */}

        <View style={styles.newsContainer}>

          {otherNews.map((news) => (

            <TouchableOpacity
              key={news.id}
              style={styles.newsCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('NewsDetails', { news })}
            >

              <Image
                source={news.image}
                style={styles.newsImage}
              />

              <View style={styles.newsContent}>

                <Text style={styles.newsDate}>
                  {news.date}
                </Text>

                <Text style={styles.newsTitle}>
                  {news.title}
                </Text>

                <View style={styles.newsFooter}>

                  <Text style={styles.newsTimeAgo}>
                    {news.timeAgo}
                  </Text>

                  <Text style={styles.lewaNews}>
                    Lewa News
                  </Text>

                </View>

              </View>

            </TouchableOpacity>

          ))}

        </View>



        {/* 
        LOAD MORE BUTTON
         */}

        {visibleNewsCount < filteredNews.length && (

          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() =>
              setVisibleNewsCount((prev) => prev + 4)
            }
          >

            <Text style={styles.loadMoreText}>
              Load More
            </Text>

          </TouchableOpacity>

        )}

        <View style={{ height: 120 }} />

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

container: {
  flex: 1,
  backgroundColor: colors.background,
},







/*
SEARCH
*/

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

searchInput: {
  marginLeft: 10,
  flex: 1,
  fontSize: 16,
},



/*
FEATURED NEWS
*/

featuredCard: {
  marginTop: 20,
  marginHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 20,
  overflow: 'hidden',
},

featuredImage: {
  width: '100%',
  height: 350,
  marginTop: -12,
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

featuredDescription: {
  fontSize: 14,
  color: '#eaeced',
  marginBottom: 12,
},

featuredFooter: {
  marginTop: 10,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

featuredSource: {
  color: colors.white,
},

featuredTime: {
  color: '#D1D5DB',
},

featuredSourceContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
sourceLogo: {
  width: 30,
  height: 30,
  resizeMode: 'contain',
  backgroundColor: colors.primary,
  borderRadius: 15,
  padding: 0,
},


/*
CATEGORY CHIPS
*/

categoryContainer: {
  marginTop: 20,
  paddingLeft: 20,
},

categoryChip: {
  paddingHorizontal: 18,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: '#E5E7EB',
  marginRight: 10,
},

categoryChipActive: {
  backgroundColor: '#1F2937',
},

categoryText: {
  color: '#374151',
},

categoryTextActive: {
  color: colors.white,
},



/*
NEWS LIST
*/

newsContainer: {
  marginTop: 20,
  paddingHorizontal: 20,
},

newsCard: {
  flexDirection: 'row',
  backgroundColor: colors.white,
  borderRadius: 15,
  paddingHorizontal: 12,
  paddingVertical: 12,
  marginBottom: 14,
},

newsImage: {
  width: 90,
  height: 90,
  borderRadius: 12,
  marginRight: 12,
  backgroundColor:colors.background,
},

newsContent: {
  flex: 1,
  paddingVertical: 8,
},

newsDate: {
  fontSize: 12,
  color: '#9CA3AF',
},

newsTitle: {
  fontSize: 15,
  marginTop: 4,
  marginBottom: 6,
  fontWeight: '600',
},

newsFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 20,
},

newsTimeAgo: {
  fontSize: 12,
  color: '#9CA3AF',
},

lewaNews: {
  color: colors.primary,
  fontSize: 12,
},



/*
LOAD MORE
*/

loadMoreButton: {
  alignSelf: 'center',
  backgroundColor: colors.primary,
  paddingHorizontal: 26,
  paddingVertical: 12,
  borderRadius: 20,
  marginTop: 10,
},

loadMoreText: {
  color: colors.white,
  fontSize: 14,
},

});
