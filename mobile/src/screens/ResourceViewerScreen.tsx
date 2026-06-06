import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import AppHeader from '../components/AppHeader';
import SpinningLoader from '../components/SpinningLoader';
import { colors } from '../theme/colors';
import { buildResourceViewerUrl } from '../services/resources';
import { ResourceItem } from '../types/resources';

type RootStackParamList = {
  ResourceViewer: {
    resource: ResourceItem;
  };
};

type ResourceViewerRouteProp = RouteProp<RootStackParamList, 'ResourceViewer'>;
type ResourceViewerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResourceViewer'>;

/**
 * Displays a resource document inside the app using the embedded web view.
 */
export default function ResourceViewerScreen() {
  const navigation = useNavigation<ResourceViewerNavigationProp>();
  const route = useRoute<ResourceViewerRouteProp>();
  const { resource } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={styles.container}>
      <AppHeader title={resource.title} onBackPress={() => navigation.goBack()} />

      <View style={styles.viewerShell}>
        {hasError ? (
          <View style={styles.errorState}>
            <Ionicons name="document-text-outline" size={42} color={colors.primary} />
            <Text style={styles.errorTitle}>Unable to open this document</Text>
            <Text style={styles.errorText}>
              The PDF could not be loaded in the embedded reader right now.
            </Text>
          </View>
        ) : (
          <>
            <WebView
              source={{ uri: buildResourceViewerUrl(resource.file_url) }}
              style={styles.webView}
              originWhitelist={['*']}
              allowsBackForwardNavigationGestures
              onLoadStart={() => {
                setIsLoading(true);
                setHasError(false);
              }}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
            {isLoading && (
              <View style={styles.loaderOverlay}>
                <SpinningLoader size={74} />
                <Text style={styles.loaderText}>Opening resource...</Text>
              </View>
            )}
          </>
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
  webView: {
    flex: 1,
    backgroundColor: colors.white,
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
});
