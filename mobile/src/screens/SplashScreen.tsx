import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, Animated } from 'react-native';

interface SplashScreenProps {
  isReady: boolean;
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onFinish }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const hasFinished = useRef(false);
  const [minimumAnimationComplete, setMinimumAnimationComplete] = useState(false);

  useEffect(() => {
    // Logo animation - fade in and scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation - fade in and slide up (starts after logo)
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Loader animation - fade in after text animation completes
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Spinning animation for the loader
    const spinnerAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinnerAnimation.start();

    // Keep the brand animation visible briefly while startup data is restored.
    const timer = setTimeout(() => {
      setMinimumAnimationComplete(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      spinnerAnimation.stop();
    };
  }, []);

  useEffect(() => {
    // Leave the splash once local startup data and the minimum animation are ready.
    if (isReady && minimumAnimationComplete && !hasFinished.current) {
      hasFinished.current = true;
      onFinish();
    }
  }, [isReady, minimumAnimationComplete, onFinish]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.tagline}>Built for ease, built for UB</Text>
        </Animated.View>

        <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
          <Animated.View
            style={[
              styles.spinner,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#167846', // Green background matching your Figma design
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: -20,
  },
  logo: {
    width: 200,
    height: 200,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    marginTop: 28,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
  },
});

export default SplashScreen;
