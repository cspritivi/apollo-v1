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
  },
  android: {
    /**
     * package is the Android equivalent of iOS bundleIdentifier.
     * Required for EAS Build and Play Store submission.
     */
    package: "com.apollo.tailor",
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
  plugins: ["expo-router", "expo-asset"],
  extra: {
    eas: {
      projectId: "409841e3-f700-425a-8218-58584e4433da",
    },
  },
});
