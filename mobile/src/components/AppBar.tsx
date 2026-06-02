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
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppSync } from '../contexts/AppSyncContext';

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
  const messageBadgeLabel =
    chatUnreadCount > 99 ? '99+' : chatUnreadCount > 0 ? String(chatUnreadCount) : null;

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = state.index === index;
        const iconColor = isActive ? colors.primary : 'rgba(255, 255, 255, 0.72)';
        const ioniconName = tab.id === 'Home' ? tab.iconName : `${tab.iconName}-outline`;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => navigation.navigate(tab.id)}
            activeOpacity={0.7}
          >
            {tab.iconLibrary === 'material' ? (
              <MaterialCommunityIcons
                name={tab.iconName}
                size={isActive ? 21 : 23}
                color={iconColor}
              />
            ) : (
              <Ionicons
                name={ioniconName as any}
                size={isActive ? 21 : 23}
                color={iconColor}
              />
            )}
            {isActive && <Text style={styles.tabLabel}>{tab.label}</Text>}
            {tab.id === 'LewaChat' && messageBadgeLabel && (
              <View style={[styles.messageBadge, isActive && styles.messageBadgeActive]}>
                <Text style={styles.messageBadgeText}>{messageBadgeLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 15,
    left: 8,
    right: 8,
    marginBottom: 10,
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
  tabLabel: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
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
  messageBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
  },
});

export default AppBar;
