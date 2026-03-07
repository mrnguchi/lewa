/**
 * OnboardingScreen Component
 *
 * This component displays 3 onboarding screens that users see after the splash screen.
 * Users can swipe horizontally to navigate between screens or use SKIP/NEXT buttons.
 *
 * Features:
 * - Horizontal scrolling with pagination dots
 * - Custom Poppins font family
 * - Text content in a card with subtle shadow
 * - Green brand color (#167846) for highlights and buttons
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
// Import Poppins font family from Expo Google Fonts
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Get device screen width for responsive layout
const { width } = Dimensions.get('window');

// TypeScript interface defining the structure of each onboarding screen
interface OnboardingItem {
  id: string;              
  image: any;              
  title: string;          
  description: string;     
  titleHighlight?: string; 
}

// Array containing data for all 3 onboarding screens
const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    image: require('../../assets/on-boarding-1.png'),
    title: 'Pay fees without stress',
    description:
      'No more long queues, paper receipts, or wasted time at banks. Lewa lets you handle it from your phone',
  },
  {
    id: '2',
    image: require('../../assets/on-boarding-2.png'),
    title: 'Fast, Simple & Reliable',
    titleHighlight: '&',
    description:
      'Chose your fee, make payment and Lewa verifies it instantly. no manual receipt submission',
  },
  {
    id: '3',
    image: require('../../assets/on-boarding-3.png'),
    title: 'Built for UB students',
    description:
      'Lewa connects directly to university systems and payment providers to give you a secure and reliable experience.',
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#167846" />
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const renderTitle = (title: string, highlight?: string) => {
    if (highlight) {
      const parts = title.split(highlight);
      return (
        <Text style={styles.title}>
          {parts[0]}
          <Text style={styles.titleHighlight}>{highlight}</Text>
          {parts[1]}
        </Text>
      );
    }
    return <Text style={styles.title}>{title}</Text>;
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.pagination}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      {/* Text content container with shadow - wraps both title and description */}
      <View style={styles.contentContainer}>
        <View style={styles.textCard}>
          {/* Title with optional green highlight for specific words */}
          {renderTitle(item.title, item.titleHighlight)}
          {/* Description text below the title */}
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        {currentIndex < onboardingData.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>NEXT</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={handleNext}>
            <Text style={styles.startText}>START</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },
  imageContainer: {
    width: width * 0.85,
    height: width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 35,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#167846',
  },
  inactiveDot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#167846',
  },
  // Container for the text content area
  contentContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  // Card container 
  textCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 35,
    borderRadius: 12,
    width: '103%', 
    // iOS shadow properties
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Android shadow property
    elevation: 3,
  },
  // Main title text style
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2933',
    textAlign: 'center',
    marginBottom: 12, // Space between title and description
  },
  // Green highlight for specific words in title (e.g., "&" in "Fast, Simple & Reliable")
  titleHighlight: {
    color: '#167846',
  },
  // Description text below the title
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 50,
    //paddingTop: 20,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#167846',
  },
  nextButton: {
    backgroundColor: '#167846',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 25,
  },
  nextText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#167846',
    paddingHorizontal: 64,
    paddingVertical: 14,
    borderRadius: 25,
    alignSelf: 'center',
    flex: 1,
    alignItems: 'center',
  },
  startText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;

