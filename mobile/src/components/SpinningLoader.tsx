/**
 * SpinningLoader Component
 * 
 * Animated circular loading spinner with green dots
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

interface SpinningLoaderProps {
  size?: number;
}

const SpinningLoader: React.FC<SpinningLoaderProps> = ({ size = 80 }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create infinite rotation animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  // Interpolate rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Create 8 dots in a circle with varying sizes
  const dots = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * 360) / 8;
    const radian = (angle * Math.PI) / 180;
    const radius = size / 2 - 10;

    // Calculate position for each dot
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);

    // Calculate opacity - dots fade from dark to light
    const opacity = 1 - (index * 0.12);

    // Calculate size - dots get smaller as they fade
    // Sizes range from 16px (largest) to 8px (smallest)
    const dotSize = 16 - (index * 1);

    return { x, y, opacity, dotSize, key: index };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        {dots.map((dot) => (
          <View
            key={dot.key}
            style={[
              styles.dot,
              {
                left: size / 2 + dot.x - dot.dotSize / 2,
                top: size / 2 + dot.y - dot.dotSize / 2,
                opacity: dot.opacity,
                width: dot.dotSize,
                height: dot.dotSize,
                borderRadius: dot.dotSize / 2,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
});

export default SpinningLoader;

