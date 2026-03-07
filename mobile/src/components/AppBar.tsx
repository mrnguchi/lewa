/**
 * AppBar Component
 *
 * Reusable bottom navigation bar with 5 tabs
 * - Home
 * - Calendar
 * - Updates
 * - Resources
 * - Lewa AI
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabItem {
  id: string;
  label: string;
  iconName: string;
}

const tabs: TabItem[] = [
  { id: 'Home', label: 'Home', iconName: 'home' },
  { id: 'Calendar', label: 'Calendar', iconName: 'calendar' },
  { id: 'Lewa News', label: 'Lewa News', iconName: 'radio' },
  { id: 'Resources', label: 'Resources', iconName: 'book' },
  { id: 'LewaAI', label: 'Lewa AI', iconName: 'robot' },
];

const AppBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const currentRoute = state.routes[state.index].name;

  // Hide AppBar on Lewa AI screens
  if (currentRoute === 'LewaAI') {
    return null;
  }

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = state.index === index;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => navigation.navigate(tab.id)}
            activeOpacity={0.7}
          >
            {tab.id === 'LewaAI' ? (
              <MaterialCommunityIcons
                name="robot-outline"
                size={24}
                color={isActive ? colors.primary : colors.white}
              />
            ) : (
              <Ionicons
                name={`${tab.iconName}-outline` as any}
                size={24}
                color={isActive ? colors.primary : colors.white}
              />
            )}
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
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
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 40,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.white,
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default AppBar;

