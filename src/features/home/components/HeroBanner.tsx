import { View, Text, Pressable, StyleSheet } from "react-native";

/**
 * HeroBanner — full-width promotional banner for the Home storefront.
 *
 * Displays a headline and subtext over a styled background. Tappable to
 * navigate to a target screen (e.g., products, fabrics, a collection).
 *
 * WHY A GRADIENT BACKGROUND INSTEAD OF AN IMAGE:
 * We use a styled solid/gradient background rather than requiring a hero
 * image. This keeps the component functional without asset dependencies
 * and avoids a broken UI if images fail to load. When real campaign
 * imagery is available, swap the background View for an ImageBackground.
 */

interface HeroBannerProps {
  headline: string;
  subtext: string;
  onPress: () => void;
}

export default function HeroBanner({
  headline,
  subtext,
  onPress,
}: HeroBannerProps) {
  return (
    <Pressable
      testID="hero-banner"
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={headline}
    >
      <View style={styles.content}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtext}>{subtext}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#312e81",
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  content: {
    alignItems: "center",
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    color: "#c7d2fe",
    textAlign: "center",
    lineHeight: 22,
  },
});
