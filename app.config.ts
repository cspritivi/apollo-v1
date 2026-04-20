import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config (replaces static app.json).
 *
 * Why app.config.ts instead of app.json?
 * Static JSON can't read environment variables or conditionally set values
 * per build profile. As the project adds Stripe, Sentry, and push
 * notifications, each needs environment-specific keys injected at build
 * time. A TypeScript config file makes this possible from day one and
 * avoids a painful migration later.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "apollo-v1",
  slug: "apollo-v1",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    /**
     * bundleIdentifier is required for EAS Build and App Store submission.
     * Expo Go didn't need this because it uses its own bundle ID
     * (host.exp.Exponent). With a custom dev client, the app needs
     * its own unique identifier.
     */
    bundleIdentifier: "com.apollo.tailor",
    /**
     * Declares the app only uses standard/exempt encryption (HTTPS).
     * Required by Apple for App Store and TestFlight submissions.
     * Without this, EAS Build prompts interactively on every build.
     */
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    /**
     * package is the Android equivalent of iOS bundleIdentifier.
     * Required for EAS Build and Play Store submission.
     */
    package: "com.apollo.tailor",
    /**
     * Points EAS Build to the Firebase client config so the native build
     * initializes FirebaseApp with the FCM credentials. Without this,
     * getExpoPushTokenAsync throws "FirebaseApp is not initialized".
     */
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    /**
     * Predictive back gesture disabled — Expo Router doesn't fully
     * support Android's predictive back API yet, and enabling it
     * can cause unexpected navigation behavior.
     */
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  /**
   * URL scheme for deep linking (e.g., apollo://order/123).
   * Used by Expo Router for in-app link handling.
   */
  scheme: "apollo",
  /**
   * Fingerprint-based runtime versioning for OTA update safety.
   *
   * Expo computes a hash of all native dependencies. When native deps
   * change (new package, config plugin, etc.), the fingerprint changes
   * and old binaries won't receive the incompatible OTA update. Users
   * on older binaries stay on their last compatible update until they
   * install a new binary. This prevents the crash scenario where an
   * OTA update depends on native code the installed binary doesn't have.
   */
  runtimeVersion: {
    policy: "fingerprint",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    /**
     * expo-notifications config plugin — wires the Android notification
     * icon + color at build time (native-side Manifest entries). The icon
     * MUST be white-on-transparent; Android silhouettes any colored pixels
     * into a flat shape. We reuse the launcher's monochrome foreground,
     * which already meets this requirement. The channel itself is still
     * created at runtime via setNotificationChannelAsync (see
     * src/lib/notifications.ts) because SDK 54's plugin does not expose
     * channel config options declaratively.
     */
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#4f46e5",
      },
    ],
  ],
  updates: {
    /**
     * EAS Update URL — tells the app where to check for OTA updates.
     * Combined with runtimeVersion above, the app only downloads updates
     * whose fingerprint matches the installed native binary.
     */
    url: "https://u.expo.dev/409841e3-f700-425a-8218-58584e4433da",
  },
  extra: {
    eas: {
      projectId: "409841e3-f700-425a-8218-58584e4433da",
    },
  },
});
