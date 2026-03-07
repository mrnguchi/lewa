/**
 * LewaAIScreen Component
 *
 * Welcome screen for Lewa AI Chatbot
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const LewaAIScreen: React.FC = () => {
  const navigation = useNavigation();
  const arrowAnimation = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // Animate arrow left-right continuously
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(arrowAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [arrowAnimation]);

  const arrowTranslateX = arrowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleGetStarted = () => {
    navigation.navigate('LewaAIChat' as never);
  };

  return (
    <View style={styles.container}>
      {/* Logo at top left */}
      <Image
        source={require('../../assets/logo-3.png')}
        style={styles.logo}
      />

      {/* Large robot on the right */}
      <Image
        source={require('../../assets/bot-big-1.png')}
        style={styles.bigRobot}
      />

      {/* Small robot on the left */}
      <Image
        source={require('../../assets/bot-small-1.png')}
        style={styles.smallRobot}
      />

      {/* Content at bottom */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome to</Text>

        {/* Lewa styled text image */}
        <Image
          source={require('../../assets/lewa-t.png')}
          style={styles.lewaText}
        />

        <Text style={styles.chatbotText}>Chatbot</Text>

        {/* Get started button with animated arrow */}
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedText}>Get started</Text>
          <View style={styles.arrowCircle}>
            <Animated.View style={{ transform: [{ translateX: arrowTranslateX }] }}>
              <Ionicons name="arrow-forward" size={24} color={colors.white} />
            </Animated.View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 10,
  },
  bigRobot: {
    width: 400,
    height: 600,
    resizeMode: 'contain',
    position: 'absolute',
    top: 120,
    right: -60,
  },
  smallRobot: {
    width: 100,
    height: 120,
    resizeMode: 'contain',
    position: 'absolute',
    top: 390,
    left: 40,
  },
  content: {
    position: 'relative',
    bottom: 0,
    left: 0,
    // right: 0,
    paddingHorizontal: 20,
    // zIndex: 20,
    marginTop: '140%',
  },
  welcomeText: {
    fontSize: 19,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  lewaText: {
    width: 130,
    height: 70,
    resizeMode: 'contain',
    marginBottom: -12,
  },
  chatbotText: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 32,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 50,
    paddingVertical: 12,
    paddingLeft: 24,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  arrowCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LewaAIScreen;

