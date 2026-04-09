/**
 * Jest mock for @shopify/flash-list.
 *
 * Wraps React Native's FlatList to provide FlashList's API surface in tests.
 * FlashList requires native modules for cell recycling which aren't available
 * in the Jest environment. Mapped via moduleNameMapper in jest.base.config.js.
 */
import React from "react";
import { FlatList } from "react-native";
import type { FlatListProps } from "react-native";

// FlashList v2 adds `overrideItemLayout` and other props which have no
// FlatList equivalent. We accept and discard them.
interface FlashListProps<T> extends FlatListProps<T> {
  overrideItemLayout?: unknown;
}

function FlashList<T>({ overrideItemLayout, ...rest }: FlashListProps<T>) {
  return <FlatList<T> {...rest} />;
}

export { FlashList };
