import { createNavigationContainerRef } from '@react-navigation/native';
import { NewsArticle } from '../services/news';

export type RootStackParamList = {
  MainTabs: { screen?: string };
  LewaAIWelcome: undefined;
  LewaAIChat: { conversationId?: string } | undefined;
  SchoolAdminChat: { conversationId?: string } | undefined;
  Receipts:
    | {
        notificationType?: 'payment_success' | 'payment_failed';
      }
    | undefined;
  PaymentProcessing: { reference: string };
  NewsDetails:
    | {
        news: NewsArticle;
      }
    | {
        newsId: string;
      };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
