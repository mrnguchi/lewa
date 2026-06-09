import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';

import AppHeader from '../components/AppHeader';
import SpinningLoader from '../components/SpinningLoader';
import { colors } from '../theme/colors';
import { getCachedResourceFileUri } from '../services/resources';
import { ResourceItem } from '../types/resources';
import { useAndroidNavigationClearance } from '../hooks/useAndroidNavigationClearance';

type RootStackParamList = {
  ResourceViewer: {
    resource: ResourceItem;
  };
};

type ResourceViewerRouteProp = RouteProp<RootStackParamList, 'ResourceViewer'>;
type ResourceViewerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResourceViewer'>;

/**
 * Displays a cached resource document inside the native PDF reader.
 */
export default function ResourceViewerScreen() {
  const navigation = useNavigation<ResourceViewerNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const {
    hasVisibleAndroidNavControls,
    contentBottomPadding,
  } = useAndroidNavigationClearance();
  const route = useRoute<ResourceViewerRouteProp>();
  const { resource } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // I cache the document locally so opening it again is immediate and reliable.
  const prepareDocument = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setPdfUri(null);
    setCurrentPage(1);
    setNumberOfPages(0);

    try {
      const localUri = await getCachedResourceFileUri(resource, loadAttempt > 0);
      setPdfUri(localUri);
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  }, [loadAttempt, resource]);

  useEffect(() => {
    prepareDocument();
  }, [prepareDocument]);

  const handleRetry = () => {
    setLoadAttempt((currentAttempt) => currentAttempt + 1);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={resource.title} onBackPress={() => navigation.goBack()} />

      <View
        style={[
          styles.viewerShell,
          isAndroid && styles.viewerShellAndroid,
          isAndroid && {
            marginBottom: hasVisibleAndroidNavControls
              ? contentBottomPadding
              : 8,
          },
        ]}
      >
        {hasError ? (
          <View style={styles.errorState}>
            <Ionicons name="document-text-outline" size={42} color={colors.primary} />
            <Text style={styles.errorTitle}>Unable to open this document</Text>
            <Text style={styles.errorText}>
              Check your connection and try opening the PDF again.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.88}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : pdfUri ? (
          <>
            <Pdf
              source={{ uri: pdfUri }}
              style={styles.pdf}
              fitPolicy={0}
              minScale={1}
              maxScale={4}
              spacing={8}
              enableDoubleTapZoom
              trustAllCerts={false}
              onLoadComplete={(pageCount) => {
                setNumberOfPages(pageCount);
                setIsLoading(false);
              }}
              onPageChanged={(page, pageCount) => {
                setCurrentPage(page);
                setNumberOfPages(pageCount);
              }}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
            {numberOfPages > 0 && !isLoading && (
              <View style={styles.pageBadge}>
                <Text style={styles.pageBadgeText}>
                  {currentPage} / {numberOfPages}
                </Text>
              </View>
            )}
            {isLoading && (
              <View style={styles.loaderOverlay}>
                <SpinningLoader size={74} />
                <Text style={[styles.loaderText, isAndroid && styles.loaderTextAndroid]}>
                  Opening resource...
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.loaderOverlay}>
            <SpinningLoader size={74} />
            <Text style={[styles.loaderText, isAndroid && styles.loaderTextAndroid]}>
              Preparing resource...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  secondaryHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  titleBlock: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
  },
  viewerShell: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  // Android keeps the document viewer close to the screen edge with a mild shadow.
  viewerShellAndroid: {
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E9EDF1',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 246, 248, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  loaderText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
  },
  loaderTextAndroid: {
    fontSize: 13,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 138,
    height: 46,
    marginTop: 8,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
  pageBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    minWidth: 58,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(31, 43, 56, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.white,
  },
});
