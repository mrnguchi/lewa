import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { showErrorToast } from '../services/toast';

interface AppHeaderProps {
  variant?: 'default' | 'hero';
}

export default function AppHeader({ variant = 'default' }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const isHero = variant === 'hero';

  // Get current route/screen name
  const getCurrentScreen = () => {
    const state = navigation.getState();
    if (state && state.routes && state.routes.length > 0) {
      const currentRoute = state.routes[state.index];
      // Check if we're in MainTabs
      if (currentRoute.name === 'MainTabs' && currentRoute.state) {
        const tabState = currentRoute.state as any;
        if (tabState.index !== undefined && tabState.routes) {
          return tabState.routes[tabState.index].name;
        }
      }
      return currentRoute.name;
    }
    return '';
  };

  const currentScreen = getCurrentScreen();

  // Check if we should show Add News or Add Resource buttons
  const showAddNewsButton = currentScreen === 'Lewa News' && user?.role === 'president';
  const showAddResourceButton = currentScreen === 'Resources';

  // State for profile modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [subscriptionAccordionOpen, setSubscriptionAccordionOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Update notifications state when user data changes
  useEffect(() => {
    if (user) {
      setNotificationsEnabled(user.notifications_enabled);
    }
  }, [user]);

  // Handle profile image selection
  const handleEditProfileImage = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Change Profile Picture',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Gallery', onPress: pickImage },
        ]
      );
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      // TODO: Upload to backend
      console.log('Photo taken:', result.assets[0].uri);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      // TODO: Upload to backend
      console.log('Image selected:', result.assets[0].uri);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);

    try {
      // Update backend
      await api.patch(`/api/students/${user?.id}/notifications`, {
        notifications_enabled: value,
      });
      console.log('Notifications updated:', value);
    } catch {
      // Revert on error
      setNotificationsEnabled(!value);
      showErrorToast('Unable to update notifications right now.');
    }
  };

  // Handle subscription accordion toggle
  const handleSubscriptionPress = () => {
    if (!user?.subscribed) {
      setSubscriptionAccordionOpen(!subscriptionAccordionOpen);
    }
  };

  // Handle subscribe button
  const handleSubscribe = () => {
    // Close accordion and modal
    setSubscriptionAccordionOpen(false);
    setProfileModalVisible(false);

    // Navigate to PaymentMethod screen with subscription context
    // @ts-ignore - navigation typing
    navigation.navigate('PaymentMethod', {
      paymentType: 'subscription',
      amount: 10,
      feeType: null,
    });
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setProfileModalVisible(false);
            } catch {
              showErrorToast('Unable to log out right now.');
            }
          },
        },
      ]
    );
  };

  // Default profile icon
  const getProfileImageSource = () => {
    if (profileImage) {
      return { uri: profileImage };
    }
    // Default profile icon
    return require('../../assets/splash-icon.png');
  };

  return (
    <>
      {/* Header with Translation and Profile Buttons */}
      <View style={[styles.headerTop, isHero && styles.headerTopHero]}>
        <TouchableOpacity style={styles.translationButton}>
          <Image
            source={require('../../assets/translation.png')}
            style={[styles.translationIcon, isHero && styles.translationIconHero]}
          />
        </TouchableOpacity>

        {/* Add Resource Button - Only shows on the resources screen */}
        {showAddResourceButton && (
          <TouchableOpacity
            style={styles.addNewsButton}
            onPress={() => {
              // @ts-ignore - navigation typing
              navigation.navigate('AddResource');
            }}
          >
            <Ionicons name="folder-open-outline" size={18} color={colors.white} />
            <Text style={styles.addNewsButtonText}>Add Resource</Text>
          </TouchableOpacity>
        )}

        {/* Add News Button - Only shows on Lewa News screen for president role */}
        {showAddNewsButton && (
          <TouchableOpacity
            style={styles.addNewsButton}
            onPress={() => {
              // @ts-ignore - navigation typing
              navigation.navigate('AddNews');
            }}
          >
            <Ionicons name="radio" size={18} color={colors.white} />
            <Text style={styles.addNewsButtonText}>Add News</Text>
          </TouchableOpacity>
        )}

        {/* Profile Button - Opens Profile Modal */}
        <TouchableOpacity
          style={[styles.profileButton, isHero && styles.profileButtonHero]}
          onPress={() => setProfileModalVisible(true)}
        >
          {profileImage ? (
            <Image
              source={getProfileImageSource()}
              style={styles.profileButtonImage}
            />
          ) : (
            <Ionicons name="person" size={24} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.profileModalContainer}>
          
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setProfileModalVisible(false)}
          >
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* Profile Image Section */}
            <View style={styles.profileImageSection}>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.profileIconContainer]}>
                    <Ionicons name="person" size={60} color={colors.white} />
                  </View>
                )}
                {/* Edit Button */}
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={handleEditProfileImage}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Student Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Student Information</Text>

              {/* Name Row */}
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{user?.full_name || 'N/A'}</Text>
                </View>
              </View>

              {/* Matricule Row */}
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Matricule</Text>
                  <Text style={styles.infoValue}>{user?.matricule || 'N/A'}</Text>
                </View>
              </View>

              {/* Faculty Row */}
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Faculty</Text>
                  <Text style={styles.infoValue}>{user?.faculty || 'N/A'}</Text>
                </View>
              </View>

              {/* Department Row */}
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{user?.department || 'N/A'}</Text>
                </View>
              </View>

              {/* Level Row */}
              <View style={styles.infoRow}>
                <Ionicons name="bar-chart-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Level</Text>
                  <Text style={styles.infoValue}>{user?.level || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Actions Card */}
            <View style={styles.actionsCard}>

              {/* Subscription Status Badge */}
              <TouchableOpacity
                style={styles.subscriptionRow}
                onPress={handleSubscriptionPress}
                disabled={user?.subscribed}
                activeOpacity={user?.subscribed ? 1 : 0.7}
              >
                <View style={styles.subscriptionLeft}>
                  <Ionicons
                    name={user?.subscribed ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={user?.subscribed ? colors.success : colors.error}
                  />
                  <Text style={styles.subscriptionText}>Subscription </Text>
                </View>
                <View style={styles.subscriptionRight}>
                  <View style={[
                    styles.subscriptionBadge,
                    user?.subscribed ? styles.subscriptionActive : styles.subscriptionInactive
                  ]}>
                    <Text style={[
                      styles.subscriptionBadgeText,
                      user?.subscribed ? styles.subscriptionActiveText : styles.subscriptionInactiveText
                    ]}>
                      {user?.subscribed ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  {!user?.subscribed && (
                    <Ionicons
                      name={subscriptionAccordionOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textBody}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Subscription Accordion Content */}
              {!user?.subscribed && subscriptionAccordionOpen && (
                <View style={styles.subscriptionAccordion}>

                  <Text style={styles.subscriptionAccordionText}>
                    You haven't subscribed
                  </Text>
                  <Text style={styles.subscriptionPrice}>
                    500.00 XAF / Year
                  </Text>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={handleSubscribe}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Divider */}
              <View style={styles.actionDivider} />

              {/* Change Password Button */}
              <TouchableOpacity style={styles.actionRow}>
                <Text style={styles.actionText}>Change Password</Text>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textBody} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.actionDivider} />

              {/* Notifications Toggle */}
              <View style={styles.actionRow}>
                <Text style={styles.actionText}>Notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#D1D5DB', true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>

              {/* Divider */}
              <View style={styles.actionDivider} />

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Padding */}
            <View style={{ height: 40 }} />

          </ScrollView>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  // Header styles
  headerTop: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: colors.white,
  },

  headerTopHero: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },

  translationButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  translationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },

  translationIconHero: {
    tintColor: colors.white,
  },

  addNewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginLeft: 125,
  },

  addNewsButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileButtonHero: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },

  profileButtonImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    resizeMode: 'cover',
  },

  // Profile Modal styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },

  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  profileImageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
  },

  profileIconContainer: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },

  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },

  infoLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 5,
    marginTop: -5,
  },

  infoValue: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginTop: -5,
  },

  actionsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  actionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },

  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },

  logoutText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EF4444',
  },

  // Subscription Status styles
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },

  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  subscriptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },

  subscriptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  subscriptionActive: {
    backgroundColor: '#D1FAE5',
  },

  subscriptionInactive: {
    backgroundColor: '#FEE2E2',
  },

  subscriptionBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },

  subscriptionActiveText: {
    color: colors.success,
  },

  subscriptionInactiveText: {
    color: colors.error,
  },

  subscriptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Subscription Accordion styles
  subscriptionAccordion: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  subscriptionAccordionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  subscriptionPrice: {
    fontSize: 16,
    fontFamily: 'Poppins_400Bold',
    color: colors.gold,
    marginBottom: 16,
  },

  subscribeButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  subscribeButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});
