import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { markAiWelcomeSeen } from '../services/lewaChat';

type RootStackParamList = {
  LewaAIWelcome: undefined;
  LewaAIChat: {
    conversationId?: string;
  } | undefined;
};

type LewaAIWelcomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LewaAIWelcome'>;

// Presents the first-time welcome experience before a user starts using Lewa AI.
const LewaAIScreen: React.FC = () => {
  const navigation = useNavigation<LewaAIWelcomeNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const robotFloat = useRef(new Animated.Value(0)).current;
  const arrowShift = useRef(new Animated.Value(0)).current;
  const [isStarting, setIsStarting] = React.useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // Adds subtle motion so the hero robot and CTA feel alive without overwhelming the screen.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(robotFloat, {
          toValue: -10,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(robotFloat, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowShift, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(arrowShift, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [arrowShift, robotFloat]);

  if (!fontsLoaded) {
    return null;
  }

  // Marks the welcome flow as seen, then opens a draft AI chat without creating a thread yet.
  const handleGetStarted = async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    await markAiWelcomeSeen();
    navigation.replace('LewaAIChat');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.container, isAndroid && styles.containerAndroid]}>
        <View style={styles.artworkSection}>
          <Image
            source={require('../../assets/logo-3.png')}
            style={[styles.logo, isAndroid && styles.logoAndroid]}
          />

          <View style={styles.robotStage}>
            <View style={[styles.robotGlow, isAndroid && styles.robotGlowAndroid]} />

            <Animated.Image
              source={require('../../assets/bot-big-1.png')}
              style={[
                styles.heroRobot,
                isAndroid && styles.heroRobotAndroid,
                {
                  transform: [{ translateY: robotFloat }],
                },
              ]}
            />
          </View>

          <View style={[styles.miniBotShell, isAndroid && styles.miniBotShellAndroid]}>
            <Image
              source={require('../../assets/bot-small-1.png')}
              style={[styles.miniBot, isAndroid && styles.miniBotAndroid]}
            />
          </View>
        </View>

        <View style={[styles.copySection, isAndroid && styles.copySectionAndroid]}>
          <Text style={[styles.eyebrow, isAndroid && styles.eyebrowAndroid]}>Welcome to</Text>
          <Text style={[styles.lewaText, isAndroid && styles.titleAndroid]}>Lewa</Text>
          <Text style={[styles.chatbotText, isAndroid && styles.chatbotTextAndroid]}>Chatbot</Text>

          <TouchableOpacity
            style={[styles.ctaButton, isAndroid && styles.ctaButtonAndroid]}
            activeOpacity={0.9}
            onPress={() => void handleGetStarted()}
          >
            <Text style={[styles.ctaLabel, isAndroid && styles.ctaLabelAndroid]}>Get started</Text>
            <View style={[styles.ctaIconShell, isAndroid && styles.ctaIconShellAndroid]}>
              {isStarting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      {
                        translateX: arrowShift.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 4],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </Animated.View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
  },
  // I keep the Android welcome screen compact so the artwork and CTA fit comfortably.
  containerAndroid: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
  },
  artworkSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginTop: 6,
  },
  logoAndroid: {
    width: 44,
    height: 44,
    marginTop: 2,
  },
  robotStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  robotGlow: {
    position: 'absolute',
    width: 282,
    height: 282,
    borderRadius: 141,
    backgroundColor: '#EFF2F3',
    top: '20%',
    right: -68,
  },
  robotGlowAndroid: {
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -54,
  },
  heroRobot: {
    width: 360,
    height: 420,
    resizeMode: 'contain',
    right: -100,
  },
  heroRobotAndroid: {
    width: 300,
    height: 340,
    right: -70,
  },
  miniBotShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginLeft: 10,
  },
  miniBotShellAndroid: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  miniBot: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  miniBotAndroid: {
    width: 36,
    height: 36,
  },
  copySection: {
    paddingTop: 14,
  },
  copySectionAndroid: {
    paddingTop: 8,
  },
  eyebrow: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  eyebrowAndroid: {
    fontSize: 13,
  },
  lewaText: {
    fontSize: 46,
    lineHeight: 50,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    marginTop: 4,
  },
  titleAndroid: {
    fontSize: 38,
    lineHeight: 42,
  },
  chatbotText: {
    fontSize: 46,
    lineHeight: 50,
    fontFamily: 'Poppins_700Bold',
    color: '#233048',
    marginBottom: 26,
  },
  chatbotTextAndroid: {
    fontSize: 38,
    lineHeight: 42,
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingLeft: 18,
    paddingRight: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaButtonAndroid: {
    minHeight: 50,
    paddingLeft: 16,
    paddingRight: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 1,
  },
  ctaLabel: {
    fontSize: 17,
    fontFamily: 'Poppins_400Regular',
    color: '#475467',
  },
  ctaLabelAndroid: {
    fontSize: 15,
  },
  ctaIconShell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconShellAndroid: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});

export default LewaAIScreen;
