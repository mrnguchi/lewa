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
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// Import Poppins font family from Expo Google Fonts
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';

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
  const flatListRef = useRef<FlatList<OnboardingItem>>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const isCompactHeight = height < 760;
  // I tune Android separately because its nav/status bars make the iOS spacing feel oversized.
  const illustrationSize = Math.min(
    width * (isAndroid ? 0.76 : 0.85),
    height * (isAndroid || isCompactHeight ? 0.35 : 0.42),
    isAndroid ? 355 : 380
  );
  const slideTopPadding = isAndroid
    ? Math.max(isCompactHeight ? 58 : 78, Math.min(isCompactHeight ? 72 : 96, height * 0.085))
    : 80;
  const paginationBottomGap = isAndroid ? 42 : 32;
  const footerBottomPadding = Math.max(insets.bottom + 14, isAndroid ? 26 : 34);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#167846" />
      </SafeAreaView>
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
        <Text style={[styles.title, isAndroid && styles.androidTitle]}>
          {parts[0]}
          <Text style={styles.titleHighlight}>{highlight}</Text>
          {parts[1]}
        </Text>
      );
    }
    return <Text style={[styles.title, isAndroid && styles.androidTitle]}>{title}</Text>;
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => (
    <View style={[styles.slide, { width, paddingTop: slideTopPadding }]}>
      <View
        style={[
          styles.imageContainer,
          {
            width: illustrationSize,
            height: illustrationSize,
            marginBottom: isAndroid ? 16 : 20,
            paddingTop: isAndroid ? 12 : 35,
          },
        ]}
      >
        <Image source={item.image} style={styles.image} resizeMode="contain" />
      </View>

      <View style={[styles.pagination, { marginBottom: paginationBottomGap }]}>
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
      <View
        style={[
          styles.contentContainer,
          { paddingHorizontal: isAndroid ? 30 : 32 },
        ]}
      >
        <View style={styles.cardFrame}>
          {isAndroid && <View style={styles.androidSoftShadow} />}
          <View
            style={[
              styles.textCard,
              isAndroid && styles.androidTextCard,
              {
                paddingHorizontal: isAndroid ? 22 : 20,
                paddingVertical: isAndroid ? 21 : 35,
              },
            ]}
          >
            {/* Title with optional green highlight for specific words */}
            {renderTitle(item.title, item.titleHighlight)}
            {/* Description text below the title */}
            <Text style={[styles.description, isAndroid && styles.androidDescription]}>
              {item.description}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
        {currentIndex < onboardingData.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={[styles.skipText, isAndroid && styles.androidFooterText]}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextButton, isAndroid && styles.androidActionButton]}
              onPress={handleNext}
            >
              <Text style={[styles.nextText, isAndroid && styles.androidFooterText]}>NEXT</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, isAndroid && styles.androidStartButton]}
            onPress={handleNext}
          >
            <Text style={[styles.startText, isAndroid && styles.androidFooterText]}>START</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#167846',
    width: 50,
  },
  inactiveDot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#167846',
  },
  // Container for the text content area
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  cardFrame: {
    position: 'relative',
    width: '100%',
  },
  // Card container 
  textCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    // iOS shadow properties
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  androidTextCard: {
    borderWidth: 1,
    borderColor: '#F1F4F7',
    elevation: 0,
  },
  androidSoftShadow: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: 2,
    borderRadius: 12,
    backgroundColor: '#DDE3EA',
    opacity: 0.18,
  },
  // Main title text style
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2933',
    textAlign: 'center',
    marginBottom: 12, // Space between title and description
  },
  androidTitle: {
    fontSize: 21,
    lineHeight: 29,
    marginBottom: 10,
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
  androidDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  startText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  androidActionButton: {
    minWidth: 160,
    height: 50,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 25,
  },
  androidStartButton: {
    height: 50,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 25,
  },
  androidFooterText: {
    fontSize: 14,
  },
});

export default OnboardingScreen;
