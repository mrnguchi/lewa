import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { useAppSync } from '../contexts/AppSyncContext';
import {
  ChatThread,
  deleteChatConversation,
  ensureAiWelcomeStateLoaded,
  formatConversationUpdatedAt,
  getAiThreads,
  getSchoolAdminThreads,
  hasSeenAiWelcomeScreen,
} from '../services/lewaChat';
import { showSuccessToast } from '../services/toast';

type ChatTab = 'school_admin' | 'lewa_ai';

type RootStackParamList = {
  LewaAIWelcome: undefined;
  LewaAIChat: {
    conversationId?: string;
  } | undefined;
  SchoolAdminChat: {
    conversationId?: string;
  } | undefined;
  SupportDesk: undefined;
};

type LewaChatNavigationProp = NativeStackNavigationProp<RootStackParamList>;
const IS_ANDROID = Platform.OS === 'android';

// Keeps static thread avatars visually varied without introducing profile photos yet.
const THREAD_AVATAR_COLORS = ['#167846', '#DC9754', '#2563EB', '#D97706', '#7C3AED', '#D14343'];

// Derives a stable avatar background from the thread title text.
const getAvatarBackgroundColor = (title: string) => {
  const total = title.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return THREAD_AVATAR_COLORS[total % THREAD_AVATAR_COLORS.length];
};

// Uses the first letter of a thread title inside the circular avatar shell.
const getAvatarLetter = (title: string) => {
  const trimmedTitle = title.trim();
  return trimmedTitle.length ? trimmedTitle.charAt(0).toUpperCase() : 'L';
};

// Keeps long previews tidy inside the conversation list rows.
const getPreviewText = (preview: string) => {
  if (preview.length <= 76) {
    return preview;
  }

  return `${preview.slice(0, 73).trimEnd()}...`;
};

// Renders a shared conversation row used by both School Admin and Lewa AI threads.
const ConversationRow = ({
  item,
  onPress,
  onLongPress,
  onDelete,
  isDeleteVisible,
  isDeleting,
}: {
  item: ChatThread;
  onPress?: (thread: ChatThread) => void;
  onLongPress?: (thread: ChatThread) => void;
  onDelete?: (thread: ChatThread) => void;
  isDeleteVisible?: boolean;
  isDeleting?: boolean;
}) => {
  const isUnread = item.unreadCount > 0;

  return (
    <View style={[styles.threadRowWrap, isDeleteVisible && styles.threadRowWrapSelected]}>
      <TouchableOpacity
        style={[styles.threadRow, IS_ANDROID && styles.threadRowAndroid]}
        activeOpacity={0.88}
        delayLongPress={260}
        onPress={() => onPress?.(item)}
        onLongPress={() => onLongPress?.(item)}
      >
        <View
          style={[
            styles.threadAvatar,
            IS_ANDROID && styles.threadAvatarAndroid,
            { backgroundColor: getAvatarBackgroundColor(item.title) },
          ]}
        >
          <Text style={[styles.threadAvatarText, IS_ANDROID && styles.threadAvatarTextAndroid]}>
            {getAvatarLetter(item.title)}
          </Text>
        </View>

        <View style={styles.threadBody}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadTitle, IS_ANDROID && styles.threadTitleAndroid]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.threadTimestamp, isUnread && styles.threadTimestampUnread]}>
              {formatConversationUpdatedAt(item.updatedAt)}
            </Text>
          </View>

          <View style={styles.threadBottomRow}>
            <Text
              style={[
                styles.threadPreview,
                IS_ANDROID && styles.threadPreviewAndroid,
                isUnread && styles.threadPreviewUnread,
              ]}
              numberOfLines={1}
            >
              {getPreviewText(item.preview)}
            </Text>

            {isUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {isDeleteVisible ? (
        <TouchableOpacity
          style={[styles.deleteThreadAction, isDeleting && styles.deleteThreadActionDisabled]}
          activeOpacity={0.82}
          disabled={isDeleting}
          onPress={() => onDelete?.(item)}
        >
          <Ionicons name="trash-outline" size={14} color="#B42318" />
          <Text style={styles.deleteThreadText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// Shows the empty AI state once the user has already passed the welcome flow.
const EmptyAiState = ({
  onPress,
}: {
  onPress: () => void;
}) => (
  <View style={[styles.emptyStateWrap, IS_ANDROID && styles.emptyStateWrapAndroid]}>
    <View style={[styles.emptyStateArtwork, IS_ANDROID && styles.emptyStateArtworkAndroid]}>
      <Image
        source={require('../../assets/bot-small-1.png')}
        style={[styles.emptyBot, IS_ANDROID && styles.emptyBotAndroid]}
      />
    </View>

    <Text style={[styles.emptyStateTitle, IS_ANDROID && styles.emptyStateTitleAndroid]}>No chats yet</Text>
    <Text style={[styles.emptyStateText, IS_ANDROID && styles.emptyStateTextAndroid]}>
      Start a new conversation and your recent AI chats will appear here for quick return.
    </Text>

    <TouchableOpacity
      style={[styles.primaryActionButton, IS_ANDROID && styles.primaryActionButtonAndroid]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Text style={[styles.primaryActionText, IS_ANDROID && styles.primaryActionTextAndroid]}>
        Start a new chat
      </Text>
      <Ionicons name="arrow-forward" size={18} color={colors.white} />
    </TouchableOpacity>
  </View>
);

// Renders the support threads section for school-admin conversations.
const SchoolAdminTab = ({
  threads,
  onOpenThread,
  onOpenSupportDesk,
  onLongPressThread,
  onDeleteThread,
  selectedThreadId,
  deletingThreadId,
}: {
  threads: ChatThread[];
  onOpenThread: (thread: ChatThread) => void;
  onOpenSupportDesk: () => void;
  onLongPressThread: (thread: ChatThread) => void;
  onDeleteThread: (thread: ChatThread) => void;
  selectedThreadId: string | null;
  deletingThreadId: string | null;
}) => {
  if (threads.length === 0) {
    return (
      <View style={[styles.emptyStateWrap, IS_ANDROID && styles.emptyStateWrapAndroid]}>
        <View style={[styles.emptyStateArtwork, IS_ANDROID && styles.emptyStateArtworkAndroid]}>
          <Image
            source={require('../../assets/bot-small-1.png')}
            style={[styles.emptyBot, IS_ANDROID && styles.emptyBotAndroid]}
          />
        </View>

        <Text style={[styles.emptyStateTitle, IS_ANDROID && styles.emptyStateTitleAndroid]}>
          No support chats yet
        </Text>
        <Text style={[styles.emptyStateText, IS_ANDROID && styles.emptyStateTextAndroid]}>
          Submit a complaint from the support desk and your School Admin conversation will appear here.
        </Text>

        <TouchableOpacity
          style={[styles.primaryActionButton, IS_ANDROID && styles.primaryActionButtonAndroid]}
          onPress={onOpenSupportDesk}
          activeOpacity={0.88}
        >
          <Text style={[styles.primaryActionText, IS_ANDROID && styles.primaryActionTextAndroid]}>
            Open support desk
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.listSection}>
      <Text style={[styles.sectionTitle, IS_ANDROID && styles.sectionTitleAndroid]}>School Admin</Text>
      <Text style={[styles.sectionSubtitle, IS_ANDROID && styles.sectionSubtitleAndroid]}>
        Complaint threads and direct follow-up messages from school support.
      </Text>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={onOpenThread}
            onLongPress={onLongPressThread}
            onDelete={onDeleteThread}
            isDeleteVisible={selectedThreadId === item.id}
            isDeleting={deletingThreadId === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Renders the AI tab content, including the empty-state handoff after onboarding.
const LewaAiTab = ({
  threads,
  onStartChat,
  onOpenThread,
  onLongPressThread,
  onDeleteThread,
  selectedThreadId,
  deletingThreadId,
}: {
  threads: ChatThread[];
  onStartChat: () => void;
  onOpenThread: (thread: ChatThread) => void;
  onLongPressThread: (thread: ChatThread) => void;
  onDeleteThread: (thread: ChatThread) => void;
  selectedThreadId: string | null;
  deletingThreadId: string | null;
}) => {
  if (threads.length === 0) {
    return <EmptyAiState onPress={onStartChat} />;
  }

  return (
    <View style={styles.listSection}>
      <View style={styles.aiHeaderRow}>
        <View style={styles.aiHeaderText}>
          <Text style={[styles.sectionTitle, IS_ANDROID && styles.sectionTitleAndroid]}>Lewa AI</Text>
          <Text style={[styles.sectionSubtitle, IS_ANDROID && styles.sectionSubtitleAndroid]}>
            Your round-the-clock AI assistant for school-related questions, and more!
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.newChatChip, IS_ANDROID && styles.newChatChipAndroid]}
          onPress={onStartChat}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={[styles.newChatChipText, IS_ANDROID && styles.newChatChipTextAndroid]}>
            New chat
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={onOpenThread}
            onLongPress={onLongPressThread}
            onDelete={onDeleteThread}
            isDeleteVisible={selectedThreadId === item.id}
            isDeleting={deletingThreadId === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Hosts the main chat hub and decides whether to open the AI welcome flow or show saved threads.
const LewaChatScreen: React.FC = () => {
  const navigation = useNavigation<LewaChatNavigationProp>();
  const { lastSupportConversationUpdate, refreshSync } = useAppSync();
  const [activeTab, setActiveTab] = useState<ChatTab>('school_admin');
  const [schoolAdminThreads, setSchoolAdminThreads] = useState<ChatThread[]>([]);
  const [aiThreads, setAiThreads] = useState<ChatThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [threadsError, setThreadsError] = useState(false);
  const [hasSeenAiWelcome, setHasSeenAiWelcome] = useState(false);
  const [isAiStateReady, setIsAiStateReady] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Refreshes the in-memory chat state every time the chat hub comes back into focus.
  const syncThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    setThreadsError(false);

    try {
      await ensureAiWelcomeStateLoaded();
      const [schoolAdminConversations, aiConversations] = await Promise.all([
        getSchoolAdminThreads(),
        getAiThreads(),
      ]);

      setSchoolAdminThreads(schoolAdminConversations);
      setAiThreads(aiConversations);
      setHasSeenAiWelcome(hasSeenAiWelcomeScreen());
      await refreshSync();
    } catch {
      setThreadsError(true);
    } finally {
      setIsLoadingThreads(false);
      setIsAiStateReady(true);
    }
  }, [refreshSync]);

  useFocusEffect(
    useCallback(() => {
      void syncThreads();
    }, [syncThreads])
  );

  useEffect(() => {
    if (!lastSupportConversationUpdate) {
      return;
    }

    void syncThreads();
  }, [lastSupportConversationUpdate, syncThreads]);

  // Opens an existing AI conversation thread from the saved thread list.
  const handleOpenAiThread = (thread: ChatThread) => {
    if (selectedThreadId) {
      setSelectedThreadId(null);
      return;
    }

    navigation.navigate('LewaAIChat', {
      conversationId: thread.id,
    });
  };

  // Opens an existing School Admin conversation from the saved support thread list.
  const handleOpenSchoolAdminThread = (thread: ChatThread) => {
    if (selectedThreadId) {
      setSelectedThreadId(null);
      return;
    }

    navigation.navigate('SchoolAdminChat', {
      conversationId: thread.id,
    });
  };

  // Opens the complaint flow so a student can start a School Admin conversation.
  const handleOpenSupportDesk = () => {
    navigation.navigate('SupportDesk');
  };

  // Starts the AI experience, sending first-time users directly to the welcome screen.
  const handleStartAiChat = () => {
    if (!isAiStateReady) {
      return;
    }

    if (!hasSeenAiWelcome && aiThreads.length === 0) {
      navigation.navigate('LewaAIWelcome');
      return;
    }

    navigation.navigate('LewaAIChat');
  };

  // Handles the segmented-tab selection at the top of the chat hub.
  const handleSelectTab = (nextTab: ChatTab) => {
    setSelectedThreadId(null);

    if (nextTab === 'lewa_ai' && !isAiStateReady) {
      return;
    }

    if (
      nextTab === 'lewa_ai' &&
      isAiStateReady &&
      !hasSeenAiWelcome &&
      aiThreads.length === 0
    ) {
      navigation.navigate('LewaAIWelcome');
      return;
    }

    setActiveTab(nextTab);
  };

  const handleLongPressThread = useCallback((thread: ChatThread) => {
    setSelectedThreadId((currentThreadId) =>
      currentThreadId === thread.id ? null : thread.id
    );
  }, []);

  const handleDeleteThread = useCallback(async (thread: ChatThread) => {
    if (deletingThreadId) {
      return;
    }

    setDeletingThreadId(thread.id);

    try {
      await deleteChatConversation(thread.id);

      if (thread.type === 'lewa_ai') {
        setAiThreads((currentThreads) =>
          currentThreads.filter((currentThread) => currentThread.id !== thread.id)
        );
      } else {
        setSchoolAdminThreads((currentThreads) =>
          currentThreads.filter((currentThread) => currentThread.id !== thread.id)
        );
      }

      setSelectedThreadId(null);
      await refreshSync();
      showSuccessToast('Chat deleted.');
    } catch {
      // The API interceptor shows the user-facing error toast.
    } finally {
      setDeletingThreadId(null);
    }
  }, [deletingThreadId]);

  // Chooses which tab body to render under the shared dark header card.
  const activeTabContent = useMemo(() => {
    if (isLoadingThreads && schoolAdminThreads.length === 0 && aiThreads.length === 0) {
      return (
        <View style={styles.feedbackState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.feedbackStateText}>Loading your chats...</Text>
        </View>
      );
    }

    if (threadsError && schoolAdminThreads.length === 0 && aiThreads.length === 0) {
      return (
        <View style={styles.feedbackState}>
          <TouchableOpacity style={styles.retryButton} onPress={() => void syncThreads()} activeOpacity={0.88}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'school_admin') {
      return (
        <SchoolAdminTab
          threads={schoolAdminThreads}
          onOpenThread={handleOpenSchoolAdminThread}
          onOpenSupportDesk={handleOpenSupportDesk}
          onLongPressThread={handleLongPressThread}
          onDeleteThread={handleDeleteThread}
          selectedThreadId={selectedThreadId}
          deletingThreadId={deletingThreadId}
        />
      );
    }

    return (
      <LewaAiTab
        threads={aiThreads}
        onStartChat={handleStartAiChat}
        onOpenThread={handleOpenAiThread}
        onLongPressThread={handleLongPressThread}
        onDeleteThread={handleDeleteThread}
        selectedThreadId={selectedThreadId}
        deletingThreadId={deletingThreadId}
      />
    );
  }, [
    activeTab,
    aiThreads,
    handleStartAiChat,
    handleDeleteThread,
    handleLongPressThread,
    isLoadingThreads,
    deletingThreadId,
    schoolAdminThreads,
    selectedThreadId,
    syncThreads,
    threadsError,
  ]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.headerCard, IS_ANDROID && styles.headerCardAndroid]}>
          <Text style={[styles.pageTitle, IS_ANDROID && styles.pageTitleAndroid]}>Lewa Chat</Text>
          <Text style={[styles.pageSubtitle, IS_ANDROID && styles.pageSubtitleAndroid]}>
            Your support conversations and AI assistance .
          </Text>

          <View style={[styles.tabsContainer, IS_ANDROID && styles.tabsContainerAndroid]}>
            <TouchableOpacity
              style={[
                styles.tab,
                IS_ANDROID && styles.tabAndroid,
                activeTab === 'school_admin' && styles.tabActive,
              ]}
              activeOpacity={0.88}
              onPress={() => handleSelectTab('school_admin')}
            >
              <Text
                style={[
                  styles.tabText,
                  IS_ANDROID && styles.tabTextAndroid,
                  activeTab === 'school_admin' && styles.tabTextActive,
                ]}
              >
                School Admin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                IS_ANDROID && styles.tabAndroid,
                activeTab === 'lewa_ai' && styles.tabActive,
              ]}
              activeOpacity={0.88}
              onPress={() => handleSelectTab('lewa_ai')}
            >
              <Text
                style={[
                  styles.tabText,
                  IS_ANDROID && styles.tabTextAndroid,
                  activeTab === 'lewa_ai' && styles.tabTextActive,
                ]}
              >
                Lewa AI
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.contentBlock, IS_ANDROID && styles.contentBlockAndroid]}>
          {activeTabContent}
        </View>
      </View>
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
  headerCard: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 28,
    backgroundColor: colors.textPrimary,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Android uses a lighter surface so the chat hub stays clean and compact.
  headerCardAndroid: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 5,
    elevation: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
  pageTitleAndroid: {
    fontSize: 23,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.74)',
  },
  pageSubtitleAndroid: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 19,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabsContainerAndroid: {
    gap: 8,
    marginTop: 15,
    padding: 4,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabAndroid: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextAndroid: {
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  contentBlock: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 118,
  },
  contentBlockAndroid: {
    paddingHorizontal: 16,
    paddingBottom: 108,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  feedbackStateText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
    textAlign: 'center',
  },
  feedbackStateError: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Poppins_500Medium',
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  listSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  sectionTitleAndroid: {
    fontSize: 16,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  sectionSubtitleAndroid: {
    fontSize: 12,
    lineHeight: 18,
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 30,
  },
  threadRowWrap: {
    marginBottom: 12,
  },
  threadRowWrapSelected: {
    marginBottom: 16,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  threadRowAndroid: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  threadAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  threadAvatarAndroid: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 11,
  },
  threadAvatarText: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
  threadAvatarTextAndroid: {
    fontSize: 18,
  },
  threadBody: {
    flex: 1,
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  threadBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  threadTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  threadTitleAndroid: {
    fontSize: 14,
  },
  threadTimestamp: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  threadTimestampUnread: {
    color: colors.primary,
  },
  threadPreview: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  threadPreviewAndroid: {
    fontSize: 11.5,
  },
  threadPreviewUnread: {
    color: colors.textPrimary,
    fontFamily: 'Poppins_500Medium',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  deleteThreadAction: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginRight: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteThreadActionDisabled: {
    opacity: 0.62,
  },
  deleteThreadText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B42318',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiHeaderText: {
    flex: 1,
  },
  newChatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#E6F4EC',
  },
  newChatChipAndroid: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  newChatChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  newChatChipTextAndroid: {
    fontSize: 12,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  emptyStateWrapAndroid: {
    paddingHorizontal: 16,
    paddingBottom: 52,
  },
  emptyStateArtwork: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#F4F6F8',
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
    width: 58,
    height: 58,
    resizeMode: 'contain',
  },
  emptyBotAndroid: {
    width: 48,
    height: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 18,
  },
  emptyStateTitleAndroid: {
    marginTop: 10,
    fontSize: 18,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    textAlign: 'center',
  },
  emptyStateTextAndroid: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 20,
  },
  primaryActionButtonAndroid: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  primaryActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  primaryActionTextAndroid: {
    fontSize: 13,
  },
});

export default LewaChatScreen;
