import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { Ionicons } from '@expo/vector-icons';
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
import { useAndroidNavigationClearance } from '../hooks/useAndroidNavigationClearance';

import BackIconButton from '../components/BackIconButton';
import { colors } from '../theme/colors';
import { useAppSync } from '../contexts/AppSyncContext';
import { showErrorToast, showSuccessToast } from '../services/toast';
import {
  ChatMessage,
  formatMessageTimestamp,
  getSchoolAdminThreadById,
  sendSchoolAdminMessage,
} from '../services/lewaChat';

type RootStackParamList = {
  MainTabs: {
    screen: string;
  };
  SchoolAdminChat: {
    conversationId?: string;
  } | undefined;
};

type SchoolAdminChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SchoolAdminChat'>;
type SchoolAdminChatRouteProp = RouteProp<RootStackParamList, 'SchoolAdminChat'>;

const MAX_MESSAGE_LENGTH = 1000;
const IS_ANDROID = Platform.OS === 'android';
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

// Renders a message bubble for either the student or the school admin.
const ChatBubble = ({ item }: { item: ChatMessage }) => {
  const isUser = item.sender === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.adminRow]}>
      <View
        style={[
          styles.messageBubble,
          IS_ANDROID && styles.messageBubbleAndroid,
          isUser ? styles.userBubble : styles.adminBubble,
          !isUser && IS_ANDROID && styles.adminBubbleAndroid,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            IS_ANDROID && styles.messageTextAndroid,
            isUser ? styles.userMessageText : styles.adminMessageText,
          ]}
        >
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.adminMessageTime]}>
          {formatMessageTimestamp(item.createdAt)}
        </Text>
      </View>
    </View>
  );
};

// Hosts the School Admin thread so students can follow up on support conversations.
const SchoolAdminChatScreen: React.FC = () => {
  const navigation = useNavigation<SchoolAdminChatNavigationProp>();
  const route = useRoute<SchoolAdminChatRouteProp>();
  const {
    joinSupportConversation,
    lastSupportConversationUpdate,
    leaveSupportConversation,
    refreshSync,
  } = useAppSync();
  const insets = useSafeAreaInsets();
  const { contentBottomPadding } = useAndroidNavigationClearance();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadTitle, setThreadTitle] = useState('School Admin');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAttachmentMenuVisible, setIsAttachmentMenuVisible] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [composerInputHeight, setComposerInputHeight] = useState(MIN_COMPOSER_INPUT_HEIGHT);
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
  const inputDockPaddingBottom = IS_ANDROID
    ? contentBottomPadding
    : Math.max(insets.bottom, 14);
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
    setIsAttachmentMenuVisible(false);
    setMessage(nextMessage);
    setComposerInputHeight(getEstimatedInputHeight(nextMessage));
  };

  useEffect(() => {
    if (!message) {
      setComposerInputHeight(MIN_COMPOSER_INPUT_HEIGHT);
    }
  }, [message]);

  // Loads the selected School Admin conversation into the screen state.
  const syncConversation = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      setThreadTitle('School Admin');
      setMessages([]);
      setConversationError(null);
      return;
    }

    setIsLoadingConversation(true);
    setConversationError(null);

    try {
      const thread = await getSchoolAdminThreadById(conversationId);
      setThreadTitle(thread.title);
      setMessages(thread.messages);
      await refreshSync();
    } catch {
      setThreadTitle('School Admin');
      setMessages([]);
      setConversationError(null);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [refreshSync]);

  // Reconciles the screen state whenever navigation points to a different support thread.
  useEffect(() => {
    setActiveConversationId(routeConversationId);
    void syncConversation(routeConversationId);
  }, [routeConversationId, syncConversation]);

  useEffect(() => {
    if (!activeConversationId) {
      return undefined;
    }

    joinSupportConversation(activeConversationId);

    return () => {
      leaveSupportConversation(activeConversationId);
    };
  }, [activeConversationId, joinSupportConversation, leaveSupportConversation]);

  useEffect(() => {
    if (!lastSupportConversationUpdate || !activeConversationId) {
      return;
    }

    void syncConversation(activeConversationId);
  }, [activeConversationId, lastSupportConversationUpdate, syncConversation]);

  // Keeps the latest message in view as the conversation updates.
  useEffect(() => {
    if (!messages.length) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const headerSubtitle = useMemo(() => 'Support follow-up', []);

  if (!fontsLoaded) {
    return null;
  }

  // Returns the user back to the chat hub.
  const handleBack = () => {
    setIsAttachmentMenuVisible(false);

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MainTabs', { screen: 'LewaChat' });
  };

  // Sends a follow-up student message into the School Admin thread.
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSendingMessage) {
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
    setPendingAttachment(null);
    setIsSendingMessage(true);

    try {
      const result = await sendSchoolAdminMessage({
        conversationId: activeConversationId,
        text: trimmedMessage,
      });

      setActiveConversationId(result.conversation.id);
      setThreadTitle(result.conversation.title);
      setMessages(result.messages);
      await refreshSync();
    } catch {
      setMessages((currentMessages) =>
        currentMessages.filter((currentMessage) => currentMessage.id !== optimisticMessage.id)
      );
      setConversationError(null);
      setMessage(trimmedMessage);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Opens the compact attachment menu from the composer.
  const handleAttachmentPress = () => {
    setIsAttachmentMenuVisible((currentValue) => !currentValue);
  };

  const validateAndSetAttachment = async (attachment: PendingAttachment) => {
    const size = await getAttachmentSize(attachment.uri, attachment.size);

    if (size && size > MAX_ATTACHMENT_SIZE_BYTES) {
      showErrorToast(`Attachments must be ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} or smaller.`);
      return;
    }

    setPendingAttachment({ ...attachment, size });
    setIsAttachmentMenuVisible(false);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <View style={[styles.header, IS_ANDROID && styles.headerAndroid]}>
          <BackIconButton
            style={[styles.backButton, IS_ANDROID && styles.backButtonAndroid]}
            onPress={handleBack}
          />

          <View style={styles.profileBlock}>
            <View style={[styles.avatarShell, IS_ANDROID && styles.avatarShellAndroid]}>
              <Image
                source={require('../../assets/bot-small-1.png')}
                style={[styles.avatarImage, IS_ANDROID && styles.avatarImageAndroid]}
              />
            </View>

            <View style={styles.nameBlock}>
              <Text style={styles.greetingText}>{headerSubtitle}</Text>
              <Text style={[styles.userName, IS_ANDROID && styles.userNameAndroid]} numberOfLines={1}>
                {threadTitle}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerDivider} />

        <View style={[styles.contentArea, IS_ANDROID && styles.contentAreaAndroid]}>
          {isLoadingConversation ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingStateText}>Loading conversation...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={[styles.emptyConversation, IS_ANDROID && styles.emptyConversationAndroid]}>
              <View style={[styles.emptyStateArtwork, IS_ANDROID && styles.emptyStateArtworkAndroid]}>
                <Image
                  source={require('../../assets/bot-small-1.png')}
                  style={[styles.emptyBot, IS_ANDROID && styles.emptyBotAndroid]}
                />
              </View>
              <Text style={[styles.emptyTitle, IS_ANDROID && styles.emptyTitleAndroid]}>
                No messages yet
              </Text>
              <Text style={[styles.emptyDescription, IS_ANDROID && styles.emptyDescriptionAndroid]}>
                Send a follow-up message and the School Admin team will respond here.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatBubble item={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.messagesContent,
                IS_ANDROID && styles.messagesContentAndroid,
              ]}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        <View
          style={[
            styles.inputDock,
            IS_ANDROID && styles.inputDockAndroid,
            {
              paddingBottom: inputDockPaddingBottom,
            },
          ]}
        >
          {isAttachmentMenuVisible ? (
            <View
              style={[
                styles.attachmentMenu,
                IS_ANDROID && styles.attachmentMenuAndroid,
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
              IS_ANDROID && styles.inputBarAndroid,
              isComposerExpanded && styles.inputBarExpanded,
            ]}
          >
            <View style={[styles.composerBody, IS_ANDROID && styles.composerBodyAndroid]}>
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
              style={[
                styles.input,
                IS_ANDROID && styles.inputAndroid,
                { height: composerInputHeight },
              ]}
              placeholder="Reply to School Admin..."
              placeholderTextColor="#98A2B3"
              value={message}
              onChangeText={handleComposerTextChange}
              onFocus={() => setIsAttachmentMenuVisible(false)}
              multiline
              scrollEnabled={composerInputHeight >= MAX_COMPOSER_INPUT_HEIGHT}
              onContentSizeChange={handleComposerContentSizeChange}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            </View>

            <TouchableOpacity
              style={[styles.inputAccessoryButton, IS_ANDROID && styles.inputAccessoryButtonAndroid]}
              activeOpacity={0.86}
              onPress={handleAttachmentPress}
            >
              <Ionicons name="add" size={22} color="#334155" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                IS_ANDROID && styles.sendButtonAndroid,
                !message.trim() && styles.sendButtonIdle,
              ]}
              activeOpacity={0.9}
              onPress={() => void handleSendMessage()}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
  },
  // I keep Android support chats compact so the keyboard leaves room for the thread.
  headerAndroid: {
    paddingHorizontal: 12,
    paddingTop: 3,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  backButtonAndroid: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  avatarShellAndroid: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  avatarImageAndroid: {
    width: 27,
    height: 27,
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
  userNameAndroid: {
    fontSize: 15,
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
  contentAreaAndroid: {
    paddingHorizontal: 16,
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
  emptyConversationAndroid: {
    paddingBottom: 42,
  },
  emptyStateArtwork: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EFF2F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyStateArtworkAndroid: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 12,
  },
  emptyBot: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  emptyBotAndroid: {
    width: 38,
    height: 38,
  },
  emptyTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyTitleAndroid: {
    fontSize: 24,
    lineHeight: 30,
  },
  emptyDescription: {
    width: '82%',
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
  },
  emptyDescriptionAndroid: {
    width: '86%',
    fontSize: 12.5,
    lineHeight: 19,
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
  inlineErrorText: {
    marginBottom: 10,
    fontSize: 12.5,
    fontFamily: 'Poppins_500Medium',
    color: '#B42318',
    textAlign: 'center',
  },
  messagesContent: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  messagesContentAndroid: {
    paddingTop: 14,
    paddingBottom: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  adminRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleAndroid: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 8,
  },
  adminBubble: {
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
  adminBubbleAndroid: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
  },
  messageTextAndroid: {
    fontSize: 13,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.white,
  },
  adminMessageText: {
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
  adminMessageTime: {
    color: colors.textBody,
  },
  inputDock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    position: 'relative',
    flexShrink: 0,
  },
  inputDockAndroid: {
    paddingHorizontal: 12,
    paddingTop: 6,
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
  attachmentMenuAndroid: {
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
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
  inputBarAndroid: {
    minHeight: 54,
    borderRadius: 27,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 1,
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
  inputAccessoryButtonAndroid: {
    left: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  composerBody: {
    marginLeft: 44,
    marginRight: 46,
    minHeight: 42,
    justifyContent: 'flex-end',
  },
  composerBodyAndroid: {
    marginLeft: 40,
    marginRight: 42,
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
  inputAndroid: {
    fontSize: 13,
    lineHeight: 20,
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
  sendButtonAndroid: {
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  sendButtonIdle: {
    backgroundColor: colors.primary,
  },
});

export default SchoolAdminChatScreen;
