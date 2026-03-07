/**
 * LewaAIChatScreen Component
 *
 * Main chatbot screen for Lewa AI
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
  Dimensions,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const LewaAIChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const windowHeight = Dimensions.get('window').height;
  const [showMenu, setShowMenu] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [bottomPadding, setBottomPadding] = useState(20);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setBottomPadding(0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setBottomPadding(20);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Suggestion badges data
  const suggestions = [
    { id: '1', icon: 'calendar-outline', text: 'Exam date' },
    { id: '2', icon: 'time-outline', text: 'Fee deadline' },
    { id: '3', icon: 'document-text-outline', text: 'Exam results' },
    { id: '4', icon: 'school-outline', text: 'Course info' },
    { id: '5', icon: 'book-outline', text: 'Library hours' },
  ];

  // Chat history data
  const chatHistory = [
    'How to apply for transcript in UB',
    'CEC231 revision',
    'Latest news updates in UB',
    'School fee payment deadline',
  ];

  // Handle sending message
  const handleSendMessage = () => {
    if (message.trim().length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [userMessage, ...prev]);
    setMessage('');
    setHasChatStarted(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated AI response. Integration with actual AI will be implemented later.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [aiResponse, ...prev]);
    }, 1000);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestionText: string) => {
    setMessage(suggestionText);
    // Auto-send the suggestion
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: suggestionText,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [userMessage, ...prev]);
      setMessage('');
      setHasChatStarted(true);

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Here's information about "${suggestionText}". This is a simulated response.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [aiResponse, ...prev]);
      }, 1000);
    }, 100);
  };

  // Handle go home
  const handleGoHome = () => {
    navigation.navigate('MainTabs' as never);
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.messageText, item.isUser ? styles.userText : styles.aiText]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ height: windowHeight }}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* FIXED HEADER - Never scrolls */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/my-profile-ph.jpg')}
              style={styles.profilePic}
            />
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>Munoh nguchi</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleGoHome} style={styles.iconButton}>
              <Ionicons name="home" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.iconButton}>
              <Ionicons name="menu" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CHAT AREA - flex: 1, contains scrollable content */}
        <View style={styles.chatArea}>
          {!hasChatStarted ? (
            // INTRO - Fixed, centered, no scroll
            <View style={styles.introContainer}>
              <Text style={styles.mainTitle}>Need anything ?</Text>
              <Text style={styles.subtitle}>
                Lewa's smart AI assistant helps you find{'\n'}what you need faster and easier
              </Text>

              {/* Scrollable Suggestion Badges */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsContainer}
                  contentContainerStyle={styles.suggestionsContent}
                >
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionBadge}
                    onPress={() => handleSuggestionClick(suggestion.text)}
                  >
                    <Ionicons name={suggestion.icon as any} size={20} color={colors.primary} />
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            // MESSAGE CHAIN - ONLY THIS SCROLLS
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
            />
          )}
        </View>

        {/* FIXED INPUT - Always at bottom, never scrolls */}
        <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachmentButton}>
              <MaterialCommunityIcons name="attachment-plus" size={30} color={colors.textBody} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Ask anything within UB..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={message.trim().length === 0}
            >
              {message.trim().length > 0 ? (
                <Ionicons name="send" size={24} color={colors.white} />
              ) : (
                // <Image
                //   source={require('../../assets/audio-input.png')}
                //   style={styles.audioIcon}
                // />
                <Ionicons name="mic" size={24} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Sidebar Modal - Slides from right */}
        <Modal
          visible={showMenu}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowMenu(false)}
        >
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              style={styles.menuBackdrop}
              activeOpacity={1}
              onPress={() => setShowMenu(false)}
            />
            <View style={styles.menuContainer}>
              {/* Menu Header - Only close button */}
              <View style={styles.menuHeader}>
                <TouchableOpacity onPress={() => setShowMenu(false)}>
                  <Ionicons name="close" size={28} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Search Bar with New Chat Button */}
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity style={styles.newChatButton}>
                  <MaterialCommunityIcons name="chat-plus-outline" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Models Section */}
              <TouchableOpacity style={styles.menuItem}>
                <Image
                  source={require('../../assets/models.png')}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuItemText}>Models</Text>
              </TouchableOpacity>

              {/* Library Section */}
              <TouchableOpacity style={styles.menuItem}>
                <Image
                  source={require('../../assets/library.png')}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuItemText}>Library</Text>
              </TouchableOpacity>

              {/* Chat History */}
              <ScrollView style={styles.chatHistory} showsVerticalScrollIndicator={false}>
                {chatHistory.map((chat, index) => (
                  <TouchableOpacity key={index} style={styles.chatHistoryItem}>
                    <Text style={styles.chatHistoryText}>{chat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Menu Footer - Profile at bottom */}
              <View style={styles.menuFooter}>
                <Image
                  source={require('../../assets/my-profile-ph.jpg')}
                  style={styles.menuFooterPic}
                />
                <Text style={styles.menuFooterName}>Munoh nguchi</Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
  },
  greeting: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  // CHAT AREA - flex: 1, scrollable
  chatArea: {
    flex: 1,
  },
  // INTRO - Centered, fixed (no scroll)
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  // MESSAGE CHAIN - Only this scrolls
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 100,
    paddingBottom: 12, // Space for input container
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  userText: {
    color: colors.white,
  },
  aiText: {
    color: colors.textPrimary,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  suggestionsContainer: {
    maxHeight: 50,
  },
  suggestionsContent: {
    gap: 12,
    paddingHorizontal: 15,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  // FIXED INPUT - Always at bottom (like AppBar)
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100, // Space for AppBar
    backgroundColor: colors.background,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    
  },
  attachmentButton: {
    width:30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    maxHeight: 100,
    textAlignVertical: 'top',
    paddingVertical: 6,
    alignContent: 'center',
    marginBottom: 7,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  audioIcon: {
    width: 24,
    height: 24,
    // tintColor: colors.white,
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: '85%',
    backgroundColor: '#2D3748',
    paddingTop: 60,
    paddingBottom: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2933',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
  },
  newChatButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1F2933',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatIcon: {
    width: 24,
    height: 24,
    tintColor: colors.white,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: colors.white,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  chatHistory: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  chatHistoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  chatHistoryText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.white,
  },
  menuFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 20,
  },
  menuFooterPic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  menuFooterName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});

export default LewaAIChatScreen;
