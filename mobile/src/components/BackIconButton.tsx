import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

type BackIconButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// I use this everywhere so back actions match the profile modal button.
export default function BackIconButton({ onPress, style }: BackIconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.iconCenter}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={colors.textPrimary}
          style={styles.icon}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginLeft: 1,
  },
});
