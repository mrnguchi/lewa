import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface CustomToastProps {
  message: string;
  type: 'success' | 'error';
  variant?: 'solid' | 'surface';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const CustomToast: React.FC<CustomToastProps> = ({
  message,
  type,
  variant = 'solid',
  visible,
  onHide,
  duration = 1000,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const isSurface = variant === 'surface';
  const backgroundColor = type === 'success' ? colors.success : '#EF4444';
  const icon = type === 'success' ? 'checkmark-circle' : 'close-circle';
  const accentColor = type === 'success' ? colors.primary : '#DC2626';
  const iconBackground = type === 'success' ? '#E8F5ED' : '#FEECEC';

  return (
    <Animated.View
      style={[
        styles.container,
        isSurface && styles.surfaceContainer,
        {
          top: isSurface ? insets.top + 12 : 60,
          backgroundColor: isSurface ? '#FFFFFF' : backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {isSurface ? (
        <View style={[styles.surfaceIcon, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
      ) : (
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      )}
      <Text style={[styles.message, isSurface && styles.surfaceMessage]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  surfaceContainer: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  surfaceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#FFFFFF',
  },
  surfaceMessage: {
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default CustomToast;
