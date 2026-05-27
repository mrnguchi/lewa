import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Switch,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppSync } from '../contexts/AppSyncContext';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import {
  AppNotification,
  deleteNotification,
  getStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncStudentPushToken,
} from '../services/notifications';
import { showErrorToast } from '../services/toast';

interface AppHeaderProps {
  variant?: 'default' | 'hero' | 'home';
  greeting?: string;
  name?: string;
}

type ProfileReceipt = {
  id: string;
  receiptNumber: string;
  amount: string;
  receiptType: 'school_fee' | 'subscription';
  paymentType: 'fee' | 'subscription';
  academicYear: string;
  issuedAt: string;
  paymentReference: string;
  paymentMethod: 'mtn' | 'orange';
  phoneNumber: string;
  feeInstallment: 'full' | 'half' | null;
  paidAt: string;
  student: {
    name: string;
    matricule: string;
    faculty: string;
    level: string;
  };
};

type LanguageCode = 'en' | 'fr';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const LANGUAGE_OPTIONS: Array<{
  code: LanguageCode;
  shortLabel: string;
  label: string;
}> = [
  { code: 'en', shortLabel: 'EN', label: 'English' },
  { code: 'fr', shortLabel: 'FR', label: 'French' },
];

const formatReceiptAmount = (amount: string) => {
  const numericAmount = Number.parseFloat(amount);

  if (Number.isNaN(numericAmount)) {
    return '0 XAF';
  }

  return `${numericAmount.toLocaleString('en-US').replace(/,/g, ' ')} XAF`;
};

const formatReceiptDate = (dateString?: string) => {
  if (!dateString) {
    return 'Date unavailable';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getReceiptTitle = (receipt: ProfileReceipt) => {
  if (receipt.receiptType === 'subscription') {
    return 'Subscription';
  }

  return receipt.feeInstallment === 'half' ? 'Half fees' : 'Complete fees';
};

const formatFeeStatus = (status?: string) => {
  if (status === 'PAID') return 'Paid';
  if (status === 'PARTIAL') return 'Partial';
  if (status === 'REQUIRED' || status === 'NOT_PAID') return 'Not paid';
  return 'N/A';
};

const getNotificationMetadataValue = (
  notification: AppNotification,
  key: string
) => {
  const value = notification.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
};

const formatNotificationTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffInMs = Date.now() - date.getTime();
  const diffInMinutes = Math.max(0, Math.floor(diffInMs / 60000));

  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const getNotificationIcon = (type: AppNotification['type']): IoniconName => {
  if (type === 'chat_message') return 'chatbubble-ellipses';
  if (type === 'payment_success') return 'checkmark-circle';
  if (type === 'payment_failed') return 'alert-circle';
  return 'newspaper';
};

const getNotificationIconColor = (type: AppNotification['type']) => {
  if (type === 'payment_success') return colors.primary;
  if (type === 'payment_failed') return '#DC2626';
  if (type === 'news_article') return '#2563EB';
  return colors.textPrimary;
};

const getNotificationIconBackground = (type: AppNotification['type']) => {
  if (type === 'payment_success') return '#E8F5E9';
  if (type === 'payment_failed') return '#FEE2E2';
  if (type === 'news_article') return '#DBEAFE';
  return '#EEF2F7';
};

export default function AppHeader({ variant = 'default', greeting, name }: AppHeaderProps) {
  const { user, logout, refreshUserData, updateUser } = useAuth();
  const { notificationUnreadCount, refreshSync } = useAppSync();
  const navigation = useNavigation();
  const isHero = variant === 'hero';
  const isHome = variant === 'home';
  const displayName = name?.trim() || user?.full_name?.split(' ')[0] || 'Student';
  const displayGreeting = greeting?.trim() || 'Hello';

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ProfileReceipt[]>([]);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [notificationSheetVisible, setNotificationSheetVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [failedPaymentNotification, setFailedPaymentNotification] =
    useState<AppNotification | null>(null);
  const [isClearingFailedPayment, setIsClearingFailedPayment] = useState(false);

  // Update notifications state when user data changes
  useEffect(() => {
    if (user) {
      setNotificationsEnabled(user.notifications_enabled);
    }
  }, [user]);

  useEffect(() => {
    if (!profileModalVisible) {
      return;
    }

    let isActive = true;

    refreshUserData().catch(() => undefined);
    setIsReceiptsLoading(true);

    api.get('/api/receipts/my')
      .then((response) => {
        if (!isActive) {
          return;
        }

        const receipts = Array.isArray(response.data?.data) ? response.data.data : [];
        setReceiptPreview(receipts);
      })
      .catch(() => {
        if (isActive) {
          setReceiptPreview([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsReceiptsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [profileModalVisible]);

  useEffect(() => {
    if (!notificationSheetVisible || !user?.id) {
      return;
    }

    let isActive = true;

    const loadNotifications = async () => {
      setIsNotificationsLoading(true);

      try {
        const latestNotifications = await getStudentNotifications(20);

        if (!isActive) {
          return;
        }

        setNotifications(latestNotifications);
        await refreshSync();
      } catch {
        if (isActive) {
          showErrorToast('Unable to load notifications right now.');
        }
      } finally {
        if (isActive) {
          setIsNotificationsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isActive = false;
    };
  }, [notificationSheetVisible, refreshSync, user?.id]);

  useEffect(() => {
    if (!notificationSheetVisible || !user?.id) {
      return;
    }

    getStudentNotifications(20)
      .then(setNotifications)
      .catch(() => undefined);
  }, [notificationSheetVisible, notificationUnreadCount, user?.id]);

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
    if (!user?.id) {
      return;
    }

    setNotificationsEnabled(value);

    try {
      await api.patch(`/api/students/${user.id}/notifications`, {
        notifications_enabled: value,
      });
      await updateUser({ notifications_enabled: value });

      if (value) {
        await syncStudentPushToken(user.id);
      }
    } catch {
      setNotificationsEnabled(!value);
      await updateUser({ notifications_enabled: !value });
      showErrorToast('Unable to update notifications right now.');
    }
  };

  // Handle subscribe button
  const handleSubscribe = () => {
    setProfileModalVisible(false);

    // Navigate to PaymentMethod screen with subscription context
    // @ts-ignore - navigation typing
    navigation.navigate('PaymentMethod', {
      paymentType: 'subscription',
      amount: 10,
      feeType: null,
    });
  };

  const handleEditableProfileFieldPress = (fieldLabel: string) => {
    Alert.alert(fieldLabel, 'Profile editing will be available soon.');
  };

  const handleViewReceipts = () => {
    setProfileModalVisible(false);
    // @ts-ignore - navigation typing
    navigation.navigate('Receipts');
  };

  const handleOpenReceipt = (receipt: ProfileReceipt) => {
    setProfileModalVisible(false);
    // @ts-ignore - navigation typing
    navigation.navigate('ReceiptDetails', { receipt });
  };

  const handleLanguagePress = () => {
    setLanguageMenuVisible((visible) => !visible);
  };

  const handleLanguageSelect = (language: LanguageCode) => {
    setSelectedLanguage(language);
    setLanguageMenuVisible(false);
  };

  const handleOpenNotificationSheet = () => {
    setLanguageMenuVisible(false);
    setFailedPaymentNotification(null);
    setNotificationSheetVisible(true);
  };

  const updateNotificationReadState = (notificationId: string) => {
    const readAt = new Date().toISOString();

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt }
          : notification
        )
    );
    refreshSync().catch(() => undefined);
  };

  // I route each notification from the bell using the same targets as push notifications.
  const handleNotificationPress = async (notification: AppNotification) => {
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
        updateNotificationReadState(notification.id);
      }

      if (notification.type === 'payment_failed') {
        setFailedPaymentNotification(notification);
        return;
      }

      setNotificationSheetVisible(false);

      if (notification.type === 'chat_message') {
        const conversationId = getNotificationMetadataValue(notification, 'conversationId');

        if (conversationId) {
          // @ts-ignore - navigation typing
          navigation.navigate('SchoolAdminChat', { conversationId });
        }

        return;
      }

      if (notification.type === 'payment_success') {
        // @ts-ignore - navigation typing
        navigation.navigate('Receipts', { notificationType: notification.type });
        return;
      }

      if (notification.type === 'news_article') {
        const newsId =
          getNotificationMetadataValue(notification, 'newsId') ||
          notification.targetId ||
          undefined;

        if (newsId) {
          // @ts-ignore - navigation typing
          navigation.navigate('NewsDetails', { newsId });
        }
      }
    } catch {
      showErrorToast('Unable to open this notification right now.');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
      await refreshSync();
    } catch {
      showErrorToast('Unable to mark notifications as read.');
    }
  };

  // Once the failed-payment sheet is closed, I clear both the failed payment and its alert.
  const handleCloseFailedPaymentDetails = async () => {
    if (!failedPaymentNotification) {
      return;
    }

    const paymentReference = getNotificationMetadataValue(
      failedPaymentNotification,
      'paymentReference'
    );

    setIsClearingFailedPayment(true);

    try {
      if (paymentReference) {
        await api.delete(`/api/payments/${paymentReference}`, {
          suppressErrorToast: true,
        } as any);
      }

      await deleteNotification(failedPaymentNotification.id);
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== failedPaymentNotification.id
        )
      );
      setFailedPaymentNotification(null);
      await refreshSync();
    } catch {
      showErrorToast('Unable to clear this failed payment right now.');
    } finally {
      setIsClearingFailedPayment(false);
    }
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

  const failedPaymentReason =
    failedPaymentNotification
      ? getNotificationMetadataValue(failedPaymentNotification, 'reason') ||
        failedPaymentNotification.body
      : '';
  const failedPaymentAmount =
    failedPaymentNotification
      ? getNotificationMetadataValue(failedPaymentNotification, 'amount')
      : undefined;
  const failedPaymentReference =
    failedPaymentNotification
      ? getNotificationMetadataValue(failedPaymentNotification, 'paymentReference')
      : undefined;

  return (
    <>
      {/* Header with Translation and Profile Buttons */}
      {isHome ? (
        <View style={styles.homeHeader}>
          <TouchableOpacity
            style={styles.homeProfileButton}
            onPress={() => {
              setLanguageMenuVisible(false);
              setProfileModalVisible(true);
            }}
            activeOpacity={0.82}
          >
            {profileImage ? (
              <Image
                source={getProfileImageSource()}
                style={styles.homeProfileImage}
              />
            ) : (
              <Ionicons name="person" size={23} color={colors.textPrimary} />
            )}
          </TouchableOpacity>

          <View style={styles.homeGreetingCopy}>
            <Text style={styles.homeGreetingText} numberOfLines={1}>
              {displayGreeting} {displayName}
            </Text>
            <Text style={styles.homeWelcomeText}>Welcome to Lewa</Text>
          </View>

          <View style={styles.homeHeaderActions}>
            <TouchableOpacity
              style={styles.homeActionButton}
              activeOpacity={0.82}
              onPress={handleOpenNotificationSheet}
            >
              <Ionicons name="notifications" size={22} color={colors.textPrimary} />
              {notificationUnreadCount > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.homeActionButton, styles.homeTranslationButton]}
              activeOpacity={0.82}
              onPress={handleLanguagePress}
            >
              <Text style={styles.homeTranslationText}>{selectedLanguage.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.headerTop, isHero && styles.headerTopHero]}>
          <TouchableOpacity
            style={[styles.homeProfileButton, isHero && styles.profileButtonHero]}
            onPress={() => {
              setLanguageMenuVisible(false);
              setProfileModalVisible(true);
            }}
            activeOpacity={0.82}
          >
            {profileImage ? (
              <Image
                source={getProfileImageSource()}
                style={styles.homeProfileImage}
              />
            ) : (
              <Ionicons
                name="person"
                size={23}
                color={isHero ? colors.white : colors.textPrimary}
              />
            )}
          </TouchableOpacity>

          <View style={styles.defaultHeaderActions}>
            {/* Add Resource Button - Only shows on the resources screen */}
            {showAddResourceButton && (
              <TouchableOpacity
                style={styles.addNewsButton}
                onPress={() => {
                  // @ts-ignore - navigation typing
                  navigation.navigate('AddResource');
                }}
                activeOpacity={0.82}
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
                activeOpacity={0.82}
              >
                <Ionicons name="radio" size={18} color={colors.white} />
                <Text style={styles.addNewsButtonText}>Add News</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.homeActionButton, styles.homeTranslationButton]}
              activeOpacity={0.82}
              onPress={handleLanguagePress}
            >
              <Text style={styles.homeTranslationText}>{selectedLanguage.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={languageMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageMenuVisible(false)}
      >
        <View style={styles.languageMenuBackdrop}>
          <Pressable
            style={styles.languageMenuDismissLayer}
            onPress={() => setLanguageMenuVisible(false)}
          />
          <View style={styles.languageMenuSurface}>
            <Text style={styles.languageMenuTitle}>Language</Text>

            {LANGUAGE_OPTIONS.map((language) => {
              const isSelected = language.code === selectedLanguage;

              return (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    isSelected && styles.languageOptionActive,
                  ]}
                  activeOpacity={0.84}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <View style={styles.languageOptionCode}>
                    <Text style={styles.languageOptionCodeText}>
                      {language.shortLabel}
                    </Text>
                  </View>
                  <Text style={styles.languageOptionLabel}>
                    {language.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setNotificationSheetVisible(false);
          setFailedPaymentNotification(null);
        }}
      >
        <View style={styles.notificationSheetBackdrop}>
          <Pressable
            style={styles.notificationSheetDismissLayer}
            onPress={() => {
              setNotificationSheetVisible(false);
              setFailedPaymentNotification(null);
            }}
          />

          <View style={styles.notificationSheet}>
            <View style={styles.notificationSheetHandle} />

            <View style={styles.notificationSheetHeader}>
              <View>
                <Text style={styles.notificationSheetTitle}>Notifications</Text>
                <Text style={styles.notificationSheetSubtitle}>
                  {notificationUnreadCount
                    ? `${notificationUnreadCount} unread`
                    : 'All caught up'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.notificationHeaderAction}
                onPress={handleMarkAllNotificationsRead}
                activeOpacity={0.82}
              >
                <Text style={styles.notificationHeaderActionText}>Read all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.notificationListContent}
            >
              {isNotificationsLoading ? (
                <View style={styles.notificationEmptyState}>
                  <ActivityIndicator color={colors.textPrimary} />
                  <Text style={styles.notificationEmptyText}>Loading notifications...</Text>
                </View>
              ) : notifications.length ? (
                notifications.map((notification) => {
                  const iconColor = getNotificationIconColor(notification.type);
                  const iconBackground = getNotificationIconBackground(notification.type);

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationRow,
                        !notification.readAt && styles.notificationRowUnread,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                      activeOpacity={0.86}
                    >
                      <View
                        style={[
                          styles.notificationIconCircle,
                          { backgroundColor: iconBackground },
                        ]}
                      >
                        <Ionicons
                          name={getNotificationIcon(notification.type)}
                          size={20}
                          color={iconColor}
                        />
                      </View>

                      <View style={styles.notificationCopy}>
                        <View style={styles.notificationTitleRow}>
                          <Text style={styles.notificationTitle} numberOfLines={1}>
                            {notification.title}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formatNotificationTime(notification.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.notificationBody} numberOfLines={2}>
                          {notification.body}
                        </Text>
                      </View>

                      {!notification.readAt && <View style={styles.notificationUnreadDot} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.notificationEmptyState}>
                  <Ionicons name="notifications-outline" size={34} color={colors.textBody} />
                  <Text style={styles.notificationEmptyTitle}>No notifications yet</Text>
                  <Text style={styles.notificationEmptyText}>
                    Chats, news, and payment updates will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.notificationToggleCta}
              onPress={() => handleNotificationToggle(!notificationsEnabled)}
              activeOpacity={0.86}
            >
              <Text style={styles.notificationToggleText}>
                {notificationsEnabled ? 'Turn Off Notifications' : 'Turn On Notifications'}
              </Text>
            </TouchableOpacity>

            {failedPaymentNotification && (
              <View style={styles.failedPaymentSheet}>
                <View style={styles.failedPaymentIcon}>
                  <Ionicons name="alert-circle" size={34} color="#DC2626" />
                </View>
                <Text style={styles.failedPaymentTitle}>Payment failed</Text>
                <Text style={styles.failedPaymentMessage}>{failedPaymentReason}</Text>

                <View style={styles.failedPaymentMetaCard}>
                  {failedPaymentAmount && (
                    <View style={styles.failedPaymentMetaRow}>
                      <Text style={styles.failedPaymentMetaLabel}>Amount</Text>
                      <Text style={styles.failedPaymentMetaValue}>
                        {Number(failedPaymentAmount).toLocaleString()} XAF
                      </Text>
                    </View>
                  )}
                  {failedPaymentReference && (
                    <View style={styles.failedPaymentMetaRow}>
                      <Text style={styles.failedPaymentMetaLabel}>Reference</Text>
                      <Text style={styles.failedPaymentMetaValue} numberOfLines={1}>
                        {failedPaymentReference}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.failedPaymentCloseButton}
                  onPress={handleCloseFailedPaymentDetails}
                  activeOpacity={0.86}
                  disabled={isClearingFailedPayment}
                >
                  {isClearingFailedPayment ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.failedPaymentCloseText}>Close and clear</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.profileModalContainer}>
          <View style={styles.profileModalHeader}>
            <TouchableOpacity
              style={styles.modalIconButton}
              onPress={() => setProfileModalVisible(false)}
              activeOpacity={0.82}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.profileModalTitle}>Profile</Text>
            <View style={styles.modalIconButton}>
              <Ionicons name="settings-outline" size={21} color={colors.textPrimary} />
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.profileScrollContent}
          >
            <View style={styles.profileHero}>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.profileIconContainer]}>
                    <Ionicons name="person" size={54} color={colors.white} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={handleEditProfileImage}
                  activeOpacity={0.82}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.full_name || 'Student'}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.matricule || 'Matricule unavailable'}
              </Text>
            </View>

            <View style={styles.profileInfoCard}>
              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Full name</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>{user?.full_name || 'N/A'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.profileInfoRow}
                activeOpacity={0.82}
                onPress={() => handleEditableProfileFieldPress('Phone number')}
              >
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="call-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Phone</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>{user?.phone_number || 'N/A'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textBody} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileInfoRow}
                activeOpacity={0.82}
                onPress={() => handleEditableProfileFieldPress('Password')}
              >
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Password</Text>
                  <Text style={styles.profileInfoValue}>Change password</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textBody} />
              </TouchableOpacity>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="card-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Matricule</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>{user?.matricule || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="school-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Faculty</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>{user?.faculty || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Department</Text>
                  <Text style={styles.profileInfoValue} numberOfLines={1}>{user?.department || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="stats-chart-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Level</Text>
                  <Text style={styles.profileInfoValue}>{user?.level ? `Level ${user.level}` : 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="receipt-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Fee status</Text>
                  <Text style={styles.profileInfoValue}>{formatFeeStatus(user?.fee_status)}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Account status</Text>
                  <Text style={styles.profileInfoValue}>{user?.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>

              {user?.role && (
                <View style={styles.profileInfoRow}>
                  <View style={styles.profileInfoIcon}>
                    <Ionicons name="ribbon-outline" size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.profileInfoText}>
                    <Text style={styles.profileInfoLabel}>Role</Text>
                    <Text style={styles.profileInfoValue}>{user.role}</Text>
                  </View>
                </View>
              )}

              <View style={styles.profileInfoRowLast}>
                <View style={styles.profileInfoIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfoText}>
                  <Text style={styles.profileInfoLabel}>Subscription</Text>
                  <Text style={styles.profileInfoValue}>{user?.subscribed ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.profileSectionHeader}>
              <Text style={styles.profileSectionTitle}>Receipts</Text>
              <TouchableOpacity
                style={styles.profileSectionAction}
                onPress={handleViewReceipts}
                activeOpacity={0.82}
              >
                <Text style={styles.profileSectionActionText}>View all</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textBody} />
              </TouchableOpacity>
            </View>

            {isReceiptsLoading ? (
              <View style={styles.receiptsEmptyState}>
                <ActivityIndicator color={colors.textPrimary} />
                <Text style={styles.receiptsEmptyText}>Loading receipts...</Text>
              </View>
            ) : receiptPreview.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.receiptPreviewRow}
              >
                {receiptPreview.slice(0, 3).map((receipt) => (
                  <TouchableOpacity
                    key={receipt.id}
                    style={styles.receiptPreviewCard}
                    onPress={() => handleOpenReceipt(receipt)}
                    activeOpacity={0.86}
                  >
                    <View style={styles.receiptPreviewIcon}>
                      <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={styles.receiptPreviewTitle} numberOfLines={1}>
                      {getReceiptTitle(receipt)}
                    </Text>
                    <Text style={styles.receiptPreviewAmount} numberOfLines={1}>
                      {formatReceiptAmount(receipt.amount)}
                    </Text>
                    <Text style={styles.receiptPreviewDate} numberOfLines={1}>
                      {formatReceiptDate(receipt.paidAt || receipt.issuedAt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.receiptsEmptyState}>
                <Ionicons name="receipt-outline" size={34} color={colors.textBody} />
                <Text style={styles.receiptsEmptyTitle}>No payments yet</Text>
                <Text style={styles.receiptsEmptyText}>
                  Subscription and fee receipts will appear here after your first Lewa payment.
                </Text>
              </View>
            )}

            <View style={styles.profileSettingsCard}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsText}>Notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#D1D5DB', true: colors.textPrimary }}
                  thumbColor={colors.white}
                />
              </View>
              {!user?.subscribed && (
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={handleSubscribe}
                  activeOpacity={0.86}
                >
                  <Text style={styles.subscribeButtonText}>Activate subscription</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.82}
              >
                <Ionicons name="log-out-outline" size={19} color="#EF4444" />
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  // Header styles
  headerTop: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  headerTopHero: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },

  homeHeader: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },

  homeProfileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  homeProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },

  homeGreetingCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },

  homeGreetingText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    lineHeight: 20,
  },

  homeWelcomeText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    lineHeight: 18,
  },

  homeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  defaultHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
    gap: 8,
  },

  homeActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  homeTranslationButton: {
    backgroundColor: colors.textPrimary,
  },

  homeTranslationText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },

  languageMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
  },

  languageMenuDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  languageMenuSurface: {
    position: 'absolute',
    top: 106,
    right: 20,
    width: '50%',
    minWidth: 178,
    maxWidth: 220,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 9,
  },

  languageMenuTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textBody,
    marginBottom: 8,
    paddingHorizontal: 6,
  },

  languageOption: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  languageOptionActive: {
    backgroundColor: '#F1F8F4',
  },

  languageOptionCode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageOptionCodeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },

  languageOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },

  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: colors.white,
  },

  notificationSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
    justifyContent: 'flex-end',
  },

  notificationSheetDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  notificationSheet: {
    maxHeight: '74%',
    minHeight: 390,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 14,
  },

  notificationSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },

  notificationSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  notificationSheetTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  notificationSheetSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 2,
  },

  notificationHeaderAction: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationHeaderActionText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },

  notificationListContent: {
    paddingBottom: 12,
    gap: 10,
  },

  notificationRow: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },

  notificationRowUnread: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  notificationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },

  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  notificationTime: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },

  notificationBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 2,
  },

  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  notificationEmptyState: {
    minHeight: 190,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  notificationEmptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: 8,
  },

  notificationEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginTop: 5,
  },

  notificationToggleCta: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  notificationToggleText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },

  failedPaymentSheet: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 18,
  },

  failedPaymentIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  failedPaymentTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  failedPaymentMessage: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginTop: 8,
  },

  failedPaymentMetaCard: {
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    gap: 8,
  },

  failedPaymentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  failedPaymentMetaLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },

  failedPaymentMetaValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },

  failedPaymentCloseButton: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  failedPaymentCloseText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },

  addNewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },

  addNewsButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.white,
  },

  profileButtonHero: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },

  // Profile Modal styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 54,
  },

  profileModalHeader: {
    minHeight: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileModalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  profileScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 44,
  },

  profileHero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 18,
  },

  profileImageContainer: {
    position: 'relative',
    width: 112,
    height: 112,
  },

  profileImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },

  profileIconContainer: {
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },

  profileName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: 10,
  },

  profileMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 2,
  },

  profileInfoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },

  profileInfoRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },

  profileInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  profileInfoText: {
    flex: 1,
  },

  profileInfoLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginBottom: 2,
  },

  profileInfoValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },

  profileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  profileSectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  profileSectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileSectionActionText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },

  receiptPreviewRow: {
    gap: 12,
    paddingBottom: 22,
  },

  receiptPreviewCard: {
    width: 132,
    minHeight: 128,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
  },

  receiptPreviewIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  receiptPreviewTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },

  receiptPreviewAmount: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginTop: 4,
  },

  receiptPreviewDate: {
    fontSize: 9,
    lineHeight: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    marginTop: 2,
  },

  receiptsEmptyState: {
    minHeight: 132,
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 22,
  },

  receiptsEmptyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: 8,
  },

  receiptsEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginTop: 4,
  },

  profileSettingsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  settingsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },

  settingsText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },

  subscribeButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },

  subscribeButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },

  logoutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EF4444',
  },
});
