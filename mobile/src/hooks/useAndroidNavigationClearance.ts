import {
  Dimensions,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * I measure Android's navigation area because some devices do not report it
 * through the safe-area inset when the three-button controls are enabled.
 */
export const useAndroidNavigationClearance = () => {
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const isAndroid = Platform.OS === 'android';
  const screenToWindowGap = Math.max(
    0,
    Dimensions.get('screen').height - windowDimensions.height
  );
  const androidStatusSpace = StatusBar.currentHeight ?? insets.top;
  const estimatedAndroidNavSpace = Math.max(
    0,
    screenToWindowGap - androidStatusSpace
  );
  const navigationInset = isAndroid
    ? Math.max(insets.bottom, estimatedAndroidNavSpace)
    : insets.bottom;
  const hasVisibleAndroidNavControls =
    isAndroid && (navigationInset >= 32 || screenToWindowGap >= 64);

  return {
    hasVisibleAndroidNavControls,
    navigationInset,
    contentBottomPadding: hasVisibleAndroidNavControls
      ? navigationInset + 10
      : Math.max(navigationInset, 14),
  };
};
