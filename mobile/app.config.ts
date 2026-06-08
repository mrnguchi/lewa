/**
 * Provides a dynamic Expo app config so push-notification project metadata
 * can be supplied through environment variables during local and EAS builds.
 */
const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  "40fd3d03-2fb2-4b5d-86b9-a6f16237fff4";

export default {
  expo: {
    name: "Lewa",
    slug: "lewa",
    scheme: "lewa",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/logo-3.png",
      resizeMode: "contain",
      backgroundColor: "#167846",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mrnguchi.lewa",
    },
    android: {
      package: "com.mrnguchi.lewa",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-foreground.png",
        backgroundColor: "#167846",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/splash-icon.png",
    },
    plugins: [
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#167846",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Lewa to choose a profile picture from your photos.",
          cameraPermission: "Allow Lewa to take a profile picture with your camera.",
        },
      ],
      [
        "@sentry/react-native",
        {
          url: "https://sentry.io/",
          project: "lewa-mobile",
          organization: "lewa",
        },
      ],
    ],
    extra: projectId
      ? {
          eas: {
            projectId,
          },
        }
      : {},
  },
};
