import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';

// Mock user data (will be replaced with actual user data from context/file during production)
const userData = {
  name: 'MUNOH NGUCHI',
  level: 'Lv 400',
  matricule: 'CT24A456',
  faculty: 'COLLEGE OF TECHNOLOGY',
  department: 'Computer Engineering',
  profileImage: require('../../assets/my-profile-ph.jpg'),
};

export default function AppHeader() {
  // State for profile modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Handle logout (empty for now, will be implemented later)
  const handleLogout = () => {
    // TODO: Implement logout functionality
    console.log('Logout pressed');
  };

  return (
    <>
      {/* Header with Translation and Profile Buttons */}
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.translationButton}>
          <Image
            source={require('../../assets/translation.png')}
            style={styles.translationIcon}
          />
        </TouchableOpacity>

        {/* Profile Button - Opens Profile Modal */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setProfileModalVisible(true)}
        >
          <Image
            source={userData.profileImage}
            style={styles.profileButtonImage}
          />
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
                <Image
                  source={userData.profileImage}
                  style={styles.profileImage}
                />
                {/* Edit Button */}
                <TouchableOpacity style={styles.editProfileButton}>
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
                  <Text style={styles.infoValue}>{userData.name}</Text>
                </View>
              </View>

              {/* Matricule Row */}
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Matricule</Text>
                  <Text style={styles.infoValue}>{userData.matricule}</Text>
                </View>
              </View>

              {/* Faculty Row */}
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Faculty</Text>
                  <Text style={styles.infoValue}>{userData.faculty}</Text>
                </View>
              </View>

              {/* Department Row */}
              <View style={styles.infoRow}>
                <Ionicons name="book-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{userData.department}</Text>
                </View>
              </View>

              {/* Level Row */}
              <View style={styles.infoRow}>
                <Ionicons name="bar-chart-outline" size={25} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Level</Text>
                  <Text style={styles.infoValue}>{userData.level}</Text>
                </View>
              </View>
            </View>

            {/* Actions Card */}
            <View style={styles.actionsCard}>

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
                  onValueChange={setNotificationsEnabled}
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

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
});

