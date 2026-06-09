/**
 * AppBar Component
 *
 * Reusable bottom navigation bar with 5 tabs
 * - Home
 * - Calendar
 * - Updates
 * - Resources
 * - Lewa Chat
 */

import React from 'react';
import {
  Platform,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppSync } from '../contexts/AppSyncContext';
import { useAndroidNavigationClearance } from '../hooks/useAndroidNavigationClearance';

interface TabItem {
  id: string;
  label: string;
  iconName: string;
  iconLibrary?: 'ionicons' | 'material';
}

const tabs: TabItem[] = [
  { id: 'Home', label: 'Home', iconName: 'home' },
  { id: 'Calendar', label: 'Calendar', iconName: 'calendar' },
  { id: 'Lewa News', label: 'Lewa News', iconName: 'radio' },
  { id: 'Resources', label: 'Resources', iconName: 'book' },
  { id: 'LewaChat', label: 'Lewa Chat', iconName: 'message-text-outline', iconLibrary: 'material' },
];

const AppBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { chatUnreadCount } = useAppSync();
  const isAndroid = Platform.OS === 'android';
  const {
    hasVisibleAndroidNavControls,
    navigationInset,
  } = useAndroidNavigationClearance();

  // I use Android's measured navigation space so three-button controls stay clear.
  const bottomOffset = isAndroid
    ? hasVisibleAndroidNavControls
      ? navigationInset + 8
      : 18
    : 25;
  const androidSystemNavSurfaceHeight = hasVisibleAndroidNavControls
    ? navigationInset + 12
    : 0;
  const messageBadgeLabel =
    chatUnreadCount > 99 ? '99+' : chatUnreadCount > 0 ? String(chatUnreadCount) : null;

  return (
    <>
      {isAndroid && androidSystemNavSurfaceHeight > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.androidSystemNavSurface,
            { height: androidSystemNavSurfaceHeight },
          ]}
        />
      )}

      <View
        style={[
          styles.container,
          { bottom: bottomOffset },
          isAndroid && styles.androidContainer,
          hasVisibleAndroidNavControls && styles.androidControlsContainer,
        ]}
      >
        {tabs.map((tab, index) => {
          const isActive = state.index === index;
          const iconColor = isActive ? colors.primary : 'rgba(255, 255, 255, 0.72)';
          const ioniconName = tab.id === 'Home' ? tab.iconName : `${tab.iconName}-outline`;
          const iconSize = hasVisibleAndroidNavControls
            ? isActive
              ? 19
              : 21
            : isActive
              ? 21
              : 23;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                hasVisibleAndroidNavControls && styles.androidTabButton,
                isActive && styles.tabButtonActive,
                isActive && hasVisibleAndroidNavControls && styles.androidTabButtonActive,
              ]}
              onPress={() => navigation.navigate(tab.id)}
              activeOpacity={0.7}
            >
              {tab.iconLibrary === 'material' ? (
                <MaterialCommunityIcons
                  name={tab.iconName}
                  size={iconSize}
                  color={iconColor}
                />
              ) : (
                <Ionicons
                  name={ioniconName as any}
                  size={iconSize}
                  color={iconColor}
                />
              )}
              {isActive && (
                <Text
                  style={[
                    styles.tabLabel,
                    hasVisibleAndroidNavControls && styles.androidTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
              )}
              {tab.id === 'LewaChat' && messageBadgeLabel && (
                <View
                  style={[
                    styles.messageBadge,
                    hasVisibleAndroidNavControls && styles.androidMessageBadge,
                    isActive && styles.messageBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageBadgeText,
                      hasVisibleAndroidNavControls && styles.androidMessageBadgeText,
                    ]}
                  >
                    {messageBadgeLabel}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 20,
    flexDirection: 'row',
    backgroundColor: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  androidSystemNavSurface: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.background,
  },
  androidContainer: {
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  androidControlsContainer: {
    left: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 30,
  },
  tabButton: {
    width: 40,
    height: 46,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    width: 124,
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 7,
  },
  androidTabButton: {
    width: 36,
    height: 40,
    borderRadius: 20,
  },
  androidTabButtonActive: {
    width: 112,
    paddingHorizontal: 10,
    gap: 6,
  },
  tabLabel: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  androidTabLabel: {
    fontSize: 10,
  },
  messageBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  messageBadgeActive: {
    top: 3,
    right: 5,
    borderColor: colors.white,
  },
  androidMessageBadge: {
    top: 2,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
  },
  messageBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
  },
  androidMessageBadgeText: {
    fontSize: 8,
    lineHeight: 10,
  },
});

export default AppBar;
