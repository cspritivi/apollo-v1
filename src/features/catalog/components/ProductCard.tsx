import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Product } from "../../../types";
import FitGuaranteeBadge from "../../../components/FitGuaranteeBadge";

/**
 * Props for the ProductCard component.
 *
 * WHY onPress CALLBACK (SAME PATTERN AS FabricCard):
 * The card doesn't navigate itself — the parent screen decides what
 * happens on tap (navigate to the configurator). This keeps the
 * component reusable across different contexts (catalog grid, search
 * results, order history, etc.).
 */
interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

/**
 * ProductCard — displays a single product in the catalog grid.
 *
 * Shows the product image, name, base price, and a short description.
 * Designed for a 2-column FlatList grid layout, same as FabricCard.
 *
 * WHY A SEPARATE COMPONENT (NOT REUSING FabricCard):
 * Products and fabrics have different data shapes and display needs.
 * Products show a description and base price (not price-per-meter),
 * have no color tags, and no save button. Trying to make FabricCard
 * handle both would bloat it with conditionals. Two focused components
 * are clearer than one overloaded one.
 *
 * WHY BASE PRICE SHOWN AS "From $X":
 * The final price depends on fabric choice and option modifiers. Showing
 * "From $499" sets the right expectation — the base price is the minimum,
 * and premium options may increase it. This is standard e-commerce UX
 * (used by Nike, Indochino, etc.).
 */
export default function ProductCard({ product, onPress }: ProductCardProps) {
  // Convert cents to dollars for display.
  const priceDisplay = `From $${(product.base_price / 100).toFixed(2)}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${priceDisplay}`}
    >
      {/* Product image with fallback background for slow loads.
          Uses the same grey placeholder pattern as FabricCard for
          visual consistency across the catalog. */}
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${product.name} product image`}
        />
      ) : (
        // Fallback when no image URL is set (e.g., during development
        // before images are uploaded to Supabase Storage).
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>{product.name[0]}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <Text style={styles.price}>{priceDisplay}</Text>
        {/* Trust signal — compact badge on product cards reduces purchase anxiety
            for first-time custom clothing buyers. */}
        <FitGuaranteeBadge variant="compact" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.85,
  },
  image: {
    width: "100%",
    aspectRatio: 1, // Square image — matches FabricCard and our 1024x1024 assets
    backgroundColor: "#f3f4f6",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9ca3af",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
    marginBottom: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5", // Indigo — matches the accent color used across the app
  },
});
