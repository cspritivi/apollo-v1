/**
 * Jest mock for expo-image.
 *
 * Replaces expo-image's native Image component with React Native's Image
 * so tests can render without native module dependencies. Mapped via
 * moduleNameMapper in jest.base.config.js.
 */
import React from "react";
import { Image as RNImage } from "react-native";
import type { ImageProps as RNImageProps } from "react-native";

// expo-image uses `contentFit` instead of `resizeMode` and `placeholder`
// for blurhash. We map contentFit to resizeMode and ignore placeholder/
// transition since they're visual-only concerns irrelevant to tests.
function Image({
  contentFit,
  placeholder,
  transition,
  ...rest
}: RNImageProps & {
  contentFit?: string;
  placeholder?: unknown;
  transition?: unknown;
}) {
  return (
    <RNImage resizeMode={contentFit as RNImageProps["resizeMode"]} {...rest} />
  );
}

export { Image };
