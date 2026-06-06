import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
      <Image
        source={require('../../assets/pdf-icon.png')}
        style={[styles.pdfIcon, compact && styles.compactPdfIcon]}
      />

      <Text style={[styles.cardCode, compact && styles.compactCardCode]}>
        {resource.code}
      </Text>
      <Text style={[styles.cardTitle, compact && styles.compactCardTitle]} numberOfLines={2}>
        {resource.title}
      </Text>
      <Text style={[styles.cardMeta, compact && styles.compactCardMeta]} numberOfLines={1}>
        {meta}
      </Text>

      <TouchableOpacity
        style={[styles.downloadButton, compact && styles.compactDownloadButton]}
        activeOpacity={0.92}
        onPress={(event) => {
          event.stopPropagation();
          onDownloadPress(resource);
        }}
      >
        <Text style={[styles.downloadButtonText, compact && styles.compactDownloadButtonText]}>
          Download
        </Text>
        <MaterialCommunityIcons
          name="download-network"
          size={compact ? 15 : 18}
          color={colors.white}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  androidCard: {
    width: '49%',
    borderWidth: 1,
    borderColor: '#EEF2F5',
    shadowOpacity: 0.025,
    shadowRadius: 3,
    elevation: 0,
  },
  compactCard: {
    width: '49.2%',
    padding: 10,
    marginBottom: 12,
  },
  pdfIcon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 1,
    alignSelf: 'center',
  },
  compactPdfIcon: {
    width: 82,
    height: 82,
    marginBottom: 0,
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
    marginTop: 5,
    marginBottom: 5,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginBottom: 12,
  },
  compactCardMeta: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  downloadButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compactDownloadButton: {
    minHeight: 32,
    borderRadius: 7,
    gap: 5,
  },
  downloadButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  compactDownloadButtonText: {
    fontSize: 10.5,
  },
});
