import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { ResourceItem } from '../types/resources';

type ResourceCardProps = {
  resource: ResourceItem;
  meta: string;
  onDownloadPress: (resource: ResourceItem) => void;
  onPress: (resource: ResourceItem) => void;
  compact?: boolean;
};

/**
 * I keep the resource card compact so home and library previews stay consistent.
 */
export default function ResourceCard({
  resource,
  meta,
  onDownloadPress,
  onPress,
  compact = true,
}: ResourceCardProps) {
  const isAndroid = Platform.OS === 'android';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isAndroid && styles.androidCard,
        compact && styles.compactCard,
      ]}
      activeOpacity={0.92}
      onPress={() => onPress(resource)}
    >
      <View style={[styles.preview, compact && styles.compactPreview]}>
        <Image
          source={require('../../assets/pdf-icon.png')}
          style={[styles.pdfIcon, compact && styles.compactPdfIcon]}
        />
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {resource.type === 'pastQuestion' ? 'Past question' : 'Handout'}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardCode, compact && styles.compactCardCode]}>
        {resource.code}
      </Text>
      <Text style={[styles.cardTitle, compact && styles.compactCardTitle]} numberOfLines={2}>
        {resource.title}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, compact && styles.compactCardMeta]} numberOfLines={2}>
          {meta}
        </Text>

        <TouchableOpacity
          style={[styles.downloadButton, compact && styles.compactDownloadButton]}
          activeOpacity={0.88}
          accessibilityLabel={`Download ${resource.title}`}
          onPress={(event) => {
            event.stopPropagation();
            onDownloadPress(resource);
          }}
        >
          <Ionicons
            name="download-outline"
            size={compact ? 16 : 18}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  androidCard: {
    width: '49%',
    borderColor: '#E7ECEF',
  },
  compactCard: {
    width: '49.2%',
    padding: 9,
    marginBottom: 12,
  },
  preview: {
    minHeight: 92,
    borderRadius: 8,
    backgroundColor: '#F3F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  compactPreview: {
    minHeight: 76,
    marginBottom: 8,
  },
  pdfIcon: {
    width: 68,
    height: 68,
    resizeMode: 'contain',
  },
  compactPdfIcon: {
    width: 54,
    height: 54,
  },
  typeBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    maxWidth: '82%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 8.5,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  cardCode: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  compactCardCode: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  compactCardTitle: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  cardFooter: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  cardMeta: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
  },
  compactCardMeta: {
    fontSize: 9,
    lineHeight: 13,
  },
  downloadButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDownloadButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
