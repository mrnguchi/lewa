import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  useWindowDimensions,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import BackIconButton from '../components/BackIconButton';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { showErrorToast, showSuccessToast } from '../services/toast';
import {
  ChatMessage,
  deleteChatConversation,
  formatMessageTimestamp,
  getAiThreadById,
  sendAiMessage,
} from '../services/lewaChat';

type RootStackParamList = {
  MainTabs: {
    screen: string;
  };
  LewaAIChat: {
    conversationId?: string;
  } | undefined;
};

type LewaAIChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LewaAIChat'>;
type LewaAIChatRouteProp = RouteProp<RootStackParamList, 'LewaAIChat'>;

// Mirrors the compact suggestion pills shown in the empty-state mock.
const QUICK_ACTIONS = [
  {
    id: '1',
    icon: 'calendar-outline',
    label: 'Exam date',
    prompt: 'When is the next exam date?',
  },
  {
    id: '2',
    icon: 'cash-outline',
    label: 'Fee deadline',
    prompt: 'What is the next fee deadline?',
  },
  {
    id: '3',
    icon: 'document-text-outline',
    label: 'Exam results',
    prompt: 'When are exam results released?',
  },
];

const MAX_MESSAGE_LENGTH = 1000;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_COMPOSER_INPUT_HEIGHT = 40;
const MAX_COMPOSER_INPUT_HEIGHT = 150;
const MIN_COMPOSER_BAR_HEIGHT = 58;
const COMPOSER_VERTICAL_PADDING = 16;
const ATTACHMENT_CHIP_BLOCK_HEIGHT = 48;
const COMPOSER_HORIZONTAL_CHROME = 136;
const ESTIMATED_CHARACTER_WIDTH = 7.2;

type PendingAttachment = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  kind: 'file' | 'image';
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) {
    return 'Unknown size';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentSize = async (uri: string, providedSize?: number) => {
  if (providedSize) {
    return providedSize;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined;
  } catch {
    return undefined;
  }
};

// Personalizes the top greeting based on the local time of day.
const getGreeting = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return 'Good morning';
  }

  if (currentHour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

// Renders a single chat bubble for either the student or the assistant.
const ChatBubble = ({ item }: { item: ChatMessage }) => {
  const isUser = item.sender === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.assistantMessageTime]}>
          {formatMessageTimestamp(item.createdAt)}
        </Text>
      </View>
    </View>
  );
};

// Shows a lightweight typing state while the assistant reply is being simulated.
const TypingBubble = () => (
  <View style={[styles.messageRow, styles.assistantRow]}>
    <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  </View>
);

// Hosts the AI conversation UI, including draft-mode chats that only persist after the first message.
const LewaAIChatScreen: React.FC = () => {
  const navigation = useNavigation<LewaAIChatNavigationProp>();
  const route = useRoute<LewaAIChatRouteProp>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadTitle, setThreadTitle] = useState('New chat');
  const [isReplying, setIsReplying] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isAttachmentMenuVisible, setIsAttachmentMenuVisible] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [composerInputHeight, setComposerInputHeight] = useState(MIN_COMPOSER_INPUT_HEIGHT);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [, setConversationError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    route.params?.conversationId ?? null
  );

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const routeConversationId = route.params?.conversationId ?? null;
  const displayName = user?.full_name ?? 'Student';
  const greeting = useMemo(() => getGreeting(), []);
  const estimatedCharactersPerLine = Math.max(
    18,
    Math.floor((screenWidth - COMPOSER_HORIZONTAL_CHROME) / ESTIMATED_CHARACTER_WIDTH)
  );

  const getEstimatedInputHeight = useCallback(
    (text: string) => {
      const lines = text.length ? text.split('\n') : [''];
      const visualLineCount = lines.reduce((totalLines, line) => {
        return totalLines + Math.max(1, Math.ceil(line.length / estimatedCharactersPerLine));
      }, 0);

      return Math.min(
        MAX_COMPOSER_INPUT_HEIGHT,
        Math.max(MIN_COMPOSER_INPUT_HEIGHT, visualLineCount * 21 + 16)
      );
    },
    [estimatedCharactersPerLine]
  );

  const composerBarHeight = Math.max(
    MIN_COMPOSER_BAR_HEIGHT,
    composerInputHeight +
      COMPOSER_VERTICAL_PADDING +
      (pendingAttachment ? ATTACHMENT_CHIP_BLOCK_HEIGHT : 0)
  );
  const inputDockPaddingBottom = Math.max(insets.bottom, 14);
  const isComposerExpanded =
    composerInputHeight > MIN_COMPOSER_INPUT_HEIGHT ||
    message.length > 56 ||
    message.includes('\n') ||
    Boolean(pendingAttachment);

  const handleComposerContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const nextHeight = Math.min(
      MAX_COMPOSER_INPUT_HEIGHT,
      Math.max(
        MIN_COMPOSER_INPUT_HEIGHT,
        event.nativeEvent.contentSize.height,
        getEstimatedInputHeight(message)
      )
    );

    setComposerInputHeight(nextHeight);
  };

  const handleComposerTextChange = (nextMessage: string) => {
    closeAttachmentMenu();
    setMessage(nextMessage);
    setComposerInputHeight(getEstimatedInputHeight(nextMessage));
  };

  useEffect(() => {
    if (!message) {
      setComposerInputHeight(MIN_COMPOSER_INPUT_HEIGHT);
    }
  }, [message]);

  // Loads either a saved thread or an empty draft chat into the screen state.
  const syncConversation = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      setThreadTitle('New chat');
      setMessages([]);
      setConversationError(null);
      return;
    }

    setIsLoadingConversation(true);
    setConversationError(null);

    try {
      const thread = await getAiThreadById(conversationId);
      setThreadTitle(thread.title);
      setMessages(thread.messages);
    } catch {
      setThreadTitle('New chat');
      setMessages([]);
      setConversationError(null);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  // Reconciles the screen state whenever navigation points to a different thread or draft.
  useEffect(() => {
    setIsReplying(false);
    setActiveConversationId(routeConversationId);
    void syncConversation(routeConversationId);
  }, [routeConversationId, syncConversation]);

  // Keeps the latest message in view while new messages or typing states arrive.
  useEffect(() => {
    if (!messages.length && !isReplying) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [isReplying, messages]);

  if (!fontsLoaded) {
    return null;
  }

  // Hides the overflow menu before other chat actions continue.
  const closeMenu = () => {
    setIsMenuVisible(false);
  };

  const closeAttachmentMenu = () => {
    setIsAttachmentMenuVisible(false);
  };

  // Returns the user to the hub screen from an AI conversation or draft chat.
  const handleBackToChats = () => {
    closeMenu();

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MainTabs', { screen: 'LewaChat' });
  };

  // Resets the screen into a fresh draft chat without creating a saved thread yet.
  const handleCreateNewChat = () => {
    closeMenu();
    closeAttachmentMenu();
    setMessage('');
    setPendingAttachment(null);
    setIsReplying(false);
    setConversationError(null);
    setActiveConversationId(null);
    setThreadTitle('New chat');
    setMessages([]);
    navigation.replace('LewaAIChat');
  };

  // Clears the current chat body, whether the user is in a saved thread or a draft chat.
  const handleClearChat = async () => {
    setIsReplying(false);
    closeMenu();

    if (!activeConversationId) {
      setMessage('');
      setPendingAttachment(null);
      setMessages([]);
      setThreadTitle('New chat');
      setConversationError(null);
      return;
    }

    try {
      await deleteChatConversation(activeConversationId);
      setMessage('');
      setPendingAttachment(null);
      setMessages([]);
      setThreadTitle('New chat');
      setConversationError(null);
      setActiveConversationId(null);
      navigation.replace('LewaAIChat');
    } catch {
      setConversationError(null);
    }
  };

  // Reuses the main action button for sending text or focusing the input when empty.
  const handlePrimaryAction = () => {
    if (message.trim()) {
      void handleSendMessage(message);
      return;
    }

    inputRef.current?.focus();
  };

  // Creates a thread only when the first real message is sent from a draft chat.
  const handleSendMessage = async (outgoingText: string) => {
    const trimmedMessage = outgoingText.trim();

    if (!trimmedMessage || isReplying) {
      return;
    }

    if (pendingAttachment) {
      showErrorToast('Attachment upload is not connected yet. Remove it to send your message.');
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text: trimmedMessage,
      createdAt: new Date().toISOString(),
    };

    setConversationError(null);
    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
    setMessage('');
    setIsReplying(true);

    try {
      const result = await sendAiMessage({
        conversationId: activeConversationId,
        text: trimmedMessage,
      });

      setActiveConversationId(result.conversation.id);
      setThreadTitle(result.conversation.title);
      setMessages(result.messages);
    } catch {
      setMessages((currentMessages) =>
        currentMessages.filter((currentMessage) => currentMessage.id !== optimisticMessage.id)
      );
      setConversationError(null);
      setMessage(trimmedMessage);
    } finally {
      setIsReplying(false);
    }
  };

  // Converts a quick suggestion tap into the same send flow as typed messages.
  const handleSuggestionPress = (suggestionText: string) => {
    void handleSendMessage(suggestionText);
  };

  // Opens the compact attachment menu from the composer.
  const handleAttachmentPress = () => {
    closeMenu();
    setIsAttachmentMenuVisible((currentValue) => !currentValue);
  };

  const validateAndSetAttachment = async (attachment: PendingAttachment) => {
    const size = await getAttachmentSize(attachment.uri, attachment.size);

    if (size && size > MAX_ATTACHMENT_SIZE_BYTES) {
      showErrorToast(`Attachments must be ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} or smaller.`);
      return;
    }

    setPendingAttachment({ ...attachment, size });
    closeAttachmentMenu();
    showSuccessToast('Attachment added.');
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await validateAndSetAttachment({
      uri: asset.uri,
      name: asset.name ?? 'document',
      size: asset.size,
      mimeType: asset.mimeType,
      kind: 'file',
    });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      showErrorToast('Gallery permission is required to choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await validateAndSetAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'gallery-image.jpg',
      size: asset.fileSize,
      mimeType: asset.mimeType,
      kind: 'image',
    });
  };

  const handleTakePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      showErrorToast('Camera permission is required to take a picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await validateAndSetAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'camera-image.jpg',
      size: asset.fileSize,
      mimeType: asset.mimeType,
      kind: 'image',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <View style={styles.header}>
          <BackIconButton style={styles.backButton} onPress={handleBackToChats} />

          <View style={styles.profileBlock}>
            <View style={styles.avatarShell}>
              <Image source={require('../../assets/bot-small-1.png')} style={styles.avatarImage} />
            </View>

            <View style={styles.nameBlock}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuButton} activeOpacity={0.86} onPress={() => setIsMenuVisible(true)}>
            <Ionicons name="menu" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.contentArea}>
          {isLoadingConversation ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingStateText}>Loading chat...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyConversation}>
              <Text style={styles.emptyTitle}>Need anything ?</Text>
              <Text style={styles.emptyDescription}>
                Lewa&apos;s smart AI assistant helps you find what you need faster and easier.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionRow}
                style={styles.quickActionScroller}
              >
                {QUICK_ACTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionChip}
                    activeOpacity={0.9}
                    onPress={() => handleSuggestionPress(item.prompt)}
                  >
                    <View style={styles.suggestionIconShell}>
                      <Ionicons
                        name={item.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color="#31445F"
                      />
                    </View>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatBubble item={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Today</Text>
                </View>
              }
              ListFooterComponent={isReplying ? <TypingBubble /> : null}
            />
          )}
        </View>

        <View
          style={[
            styles.inputDock,
            {
              paddingBottom: inputDockPaddingBottom,
            },
          ]}
        >
          {isAttachmentMenuVisible ? (
            <View
              style={[
                styles.attachmentMenu,
                { bottom: composerBarHeight + inputDockPaddingBottom + 10 },
              ]}
            >
              <TouchableOpacity style={styles.attachmentMenuItem} activeOpacity={0.86} onPress={handlePickFile}>
                <Ionicons name="document-attach-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.attachmentMenuText}>File</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentMenuItem} activeOpacity={0.86} onPress={handlePickImage}>
                <Ionicons name="images-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.attachmentMenuText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentMenuItem} activeOpacity={0.86} onPress={handleTakePicture}>
                <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.attachmentMenuText}>Camera</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View
            style={[
              styles.inputBar,
              isComposerExpanded && styles.inputBarExpanded,
            ]}
          >
            <View style={styles.composerBody}>
              {pendingAttachment ? (
                <View style={styles.attachmentChip}>
                  <View style={styles.attachmentChipIcon}>
                    <Ionicons
                      name={pendingAttachment.kind === 'image' ? 'image-outline' : 'document-text-outline'}
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.attachmentChipTextBlock}>
                    <Text style={styles.attachmentChipName} numberOfLines={1}>
                      {pendingAttachment.name}
                    </Text>
                    <Text style={styles.attachmentChipMeta}>
                      {formatFileSize(pendingAttachment.size)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.attachmentRemoveButton}
                    activeOpacity={0.86}
                    onPress={() => setPendingAttachment(null)}
                  >
                    <Ionicons name="close" size={14} color={colors.textBody} />
                  </TouchableOpacity>
                </View>
              ) : null}

            <TextInput
              ref={inputRef}
              style={[styles.input, { height: composerInputHeight }]}
              placeholder="Ask anything within UB..."
              placeholderTextColor="#98A2B3"
              value={message}
              onChangeText={handleComposerTextChange}
              onFocus={() => {
                closeMenu();
                closeAttachmentMenu();
              }}
              multiline
              scrollEnabled={composerInputHeight >= MAX_COMPOSER_INPUT_HEIGHT}
              onContentSizeChange={handleComposerContentSizeChange}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            </View>

            <TouchableOpacity style={styles.inputAccessoryButton} activeOpacity={0.86} onPress={handleAttachmentPress}>
              <Ionicons name="add" size={22} color="#334155" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonIdle]}
              activeOpacity={0.9}
              onPress={handlePrimaryAction}
            >
              {message.trim() ? (
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              ) : (
                <MaterialCommunityIcons name="equalizer" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isMenuVisible ? (
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={closeMenu}>
            <View style={[styles.menuCard, { top: insets.top + 60 }]}>
              <Text style={styles.menuLabel}>{threadTitle}</Text>

              <TouchableOpacity style={styles.menuItem} onPress={handleCreateNewChat}>
                <Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>New chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>Clear chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleBackToChats}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>Back to chats</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  nameBlock: {
    marginLeft: 10,
    flex: 1,
  },
  greetingText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: '#E5E7EB',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingStateText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  emptyConversation: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
  },
  emptyTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyDescription: {
    width: '78%',
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
  },
  errorText: {
    width: '82%',
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
    color: '#B42318',
    textAlign: 'center',
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  quickActionScroller: {
    marginTop: 24,
    maxHeight: 40,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#EEF1F4',
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 8,
  },
  suggestionIconShell: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCE4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#344054',
  },
  messagesContent: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  dayBadge: {
    alignSelf: 'center',
    backgroundColor: '#EEF0F2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  dayBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 8,
  },
  assistantBubble: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#ECEFF3',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  typingBubble: {
    minWidth: 74,
    alignItems: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
  },
  userMessageText: {
    color: colors.white,
  },
  assistantMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'right',
  },
  assistantMessageTime: {
    color: colors.textBody,
  },
  inputDock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    position: 'relative',
    flexShrink: 0,
  },
  attachmentMenu: {
    position: 'absolute',
    left: 18,
    bottom: 78,
    width: 178,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 8,
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  attachmentMenuText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  inputBar: {
    minHeight: 58,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  inputBarExpanded: {
    borderRadius: 22,
    paddingTop: 10,
  },
  inputAccessoryButton: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerBody: {
    marginLeft: 44,
    marginRight: 46,
    minHeight: 42,
    justifyContent: 'flex-end',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#F3F6F8',
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 6,
  },
  attachmentChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentChipTextBlock: {
    flex: 1,
  },
  attachmentChipName: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  attachmentChipMeta: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  attachmentRemoveButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    textAlignVertical: 'top',
  },
  sendButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonIdle: {
    backgroundColor: colors.primary,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  menuCard: {
    position: 'absolute',
    right: 20,
    width: 196,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  menuLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
});

export default LewaAIChatScreen;
