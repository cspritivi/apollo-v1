/**
 * AppImage — shared image wrapper around expo-image.
 *
 * Encapsulates default blurhash placeholder, fade-in transition, and
 * content fit so every image in the app gets consistent loading behavior
 * without duplicating props across 10+ files. Future upgrades (per-image
 * blurhash, cache policy changes) happen here instead of in every consumer.
 *
 * TWO DISTINCT FALLBACK MODELS (intentionally separate):
 *
 * 1. MISSING SOURCE (source is null/undefined):
 *    If `fallbackText` is provided, renders a View with the letter
 *    (e.g., first letter of product name). If `fallbackText` is not
 *    provided, renders nothing — parent's background shows through.
 *    This is for development/data gaps where no image URL exists yet.
 *
 * 2. LOAD FAILURE (source exists but 404/network error):
 *    expo-image keeps the blurhash placeholder visible. `fallbackText`
 *    is NOT used for load failures. The grey blurhash is the failure
 *    state. This avoids two competing fallback models fighting for the
 *    same pixel space and keeps the component's behavior predictable.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { Image } from "expo-image";
import type { ImageProps } from "expo-image";
import { DEFAULT_BLURHASH, IMAGE_TRANSITION } from "@/lib/imageConstants";

interface AppImageProps extends Omit<
  ImageProps,
  "source" | "placeholder" | "transition"
> {
  /** Image URI. Accepts null/undefined for missing images. */
  source: string | null | undefined;
  /** Fallback letter shown when source is missing (not on load error). */
  fallbackText?: string;
  /** Style for the fallback View container. Should match the image dimensions. */
  fallbackStyle?: StyleProp<ViewStyle>;
  /** Style for the fallback letter Text. */
  fallbackTextStyle?: StyleProp<TextStyle>;
}

export default function AppImage({
  source,
  fallbackText,
  fallbackStyle,
  fallbackTextStyle,
  contentFit = "cover",
  style,
  // Destructure accessibility props so fallback Views stay labeled.
  // expo-image accepts these via ...rest, but the fallback paths render
  // plain Views which need them explicitly to avoid regressing a11y.
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
  accessible,
  ...rest
}: AppImageProps) {
  const a11yProps = {
    accessibilityLabel,
    accessibilityRole,
    accessibilityHint,
    accessible,
  };

  // Missing source — render letter fallback or nothing
  if (!source) {
    if (fallbackText) {
      return (
        <View style={[styles.fallback, style, fallbackStyle]} {...a11yProps}>
          <Text style={[styles.fallbackText, fallbackTextStyle]}>
            {fallbackText}
          </Text>
        </View>
      );
    }
    // No source and no fallback text — render empty View so parent
    // layout isn't disrupted (maintains the image's space)
    return <View style={style} {...a11yProps} />;
  }

  // Source exists — render expo-image with defaults.
  // On load failure, the blurhash placeholder stays visible.
  return (
    <Image
      source={{ uri: source }}
      style={style}
      contentFit={contentFit}
      placeholder={{ blurhash: DEFAULT_BLURHASH }}
      transition={IMAGE_TRANSITION}
      {...a11yProps}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9ca3af",
  },
});
