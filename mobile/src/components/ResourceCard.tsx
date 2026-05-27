import React from 'react';
import {
  Image,
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
};

/**
 * I keep the resource card shared so home previews and the full library stay visually identical.
 */
export default function ResourceCard({
  resource,
  meta,
  onDownloadPress,
  onPress,
}: ResourceCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => onPress(resource)}
    >
      <Image
        source={require('../../assets/pdf-icon.png')}
        style={styles.pdfIcon}
      />

      <Text style={styles.cardCode}>{resource.code}</Text>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {resource.title}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {meta}
      </Text>

      <TouchableOpacity
        style={styles.downloadButton}
        activeOpacity={0.92}
        onPress={(event) => {
          event.stopPropagation();
          onDownloadPress(resource);
        }}
      >
        <Text style={styles.downloadButtonText}>Download</Text>
        <MaterialCommunityIcons name="download-network" size={18} color={colors.white} />
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
  pdfIcon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 1,
    alignSelf: 'center',
  },
  cardCode: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginBottom: 12,
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
  downloadButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});
