import { useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useProduct,
  useProductOptions,
} from "../../../src/features/catalog/hooks";
import { useConfiguratorStore } from "../../../src/stores/configuratorStore";
import { useCartStore } from "../../../src/stores/cartStore";
import { useCreateOrder } from "../../../src/features/orders/hooks";
import { useSession } from "../../../src/hooks/useSession";
import { calculatePrice } from "../../../src/features/orders/utils/calculatePrice";
import Toast from "react-native-toast-message";
import ProgressBar from "../../../src/features/configurator/components/ProgressBar";
import FabricSelectionStep from "../../../src/features/configurator/components/FabricSelectionStep";
import OptionStep, {
  formatOptionGroupTitle,
} from "../../../src/features/configurator/components/OptionStep";
import ReviewSummary from "../../../src/features/configurator/components/ReviewSummary";
import SupportFAB from "../../../src/components/SupportFAB";

/**
 * Configurator Screen — the multi-step product configuration wizard.
 *
 * This is the orchestration layer that connects:
 * - Route params (productId from the products catalog)
 * - React Query hooks (product data + option data from Supabase)
 * - Zustand store (client-side selection state across steps)
 * - Step components (FabricSelectionStep, OptionStep, ReviewSummary)
 *
 * HOW STEP MAPPING WORKS:
 * The product's option_groups array (e.g., ["lapel_style", "button_count", ...])
 * defines the middle steps. The wizard always has:
 *   Step 0: Fabric selection
 *   Steps 1..N: One per option_group (in array order)
 *   Step N+1: Review summary
 *
 * The store's currentStep index maps to the right component via a simple
 * conditional: step 0 → FabricSelectionStep, last step → ReviewSummary,
 * everything in between → OptionStep with the corresponding option_group.
 *
 * WHY THE SCREEN IS A THIN ORCHESTRATOR:
 * This file has almost no business logic. It reads from the store, passes
 * data to step components, and connects user actions (Next/Back) to store
 * actions. The actual selection logic lives in the store. The actual
 * rendering logic lives in the step components. This separation means
 * you can understand the wizard flow by reading this file alone, and
 * understand each step's behavior by reading its component alone.
 *
 * INTERVIEW TALKING POINT:
 * "The configurator screen is a thin orchestrator — it connects route params
 * to React Query hooks to a Zustand store to step components. Each layer has
 * a single responsibility. This makes the wizard easy to modify: adding a
 * new step is a database change, changing step UI is a component change,
 * changing navigation logic is a store change. None of these require
 * touching the other layers."
 */
export default function ConfiguratorScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { session } = useSession();

  // --- Cart store ---
  const addToCart = useCartStore((s) => s.addItem);

  // --- Order creation mutation (express checkout) ---
  const createOrderMutation = useCreateOrder();

  // --- Server state: fetch product and its options from Supabase ---
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: groupedOptions, isLoading: optionsLoading } = useProductOptions(
    product?.id,
  );

  // --- Client state: read from Zustand store ---
  // Each selector subscribes to only the slice it needs — changing fabric
  // doesn't re-render the progress bar, changing step doesn't re-render
  // the review summary, etc.
  const storeProduct = useConfiguratorStore((s) => s.product);
  const fabric = useConfiguratorStore((s) => s.fabric);
  const selectedOptions = useConfiguratorStore((s) => s.selectedOptions);
  const currentStep = useConfiguratorStore((s) => s.currentStep);
  const customerNotes = useConfiguratorStore((s) => s.customerNotes);
  const totalSteps = useConfiguratorStore((s) => s.totalSteps());
  const isReviewStep = useConfiguratorStore((s) => s.isReviewStep());
  const currentOptionGroup = useConfiguratorStore((s) =>
    s.currentOptionGroup(),
  );

  // --- Store actions ---
  const setProduct = useConfiguratorStore((s) => s.setProduct);
  const setFabric = useConfiguratorStore((s) => s.setFabric);
  const selectOption = useConfiguratorStore((s) => s.selectOption);
  const nextStep = useConfiguratorStore((s) => s.nextStep);
  const prevStep = useConfiguratorStore((s) => s.prevStep);
  const goToStep = useConfiguratorStore((s) => s.goToStep);
  const setCustomerNotes = useConfiguratorStore((s) => s.setCustomerNotes);
  const reset = useConfiguratorStore((s) => s.reset);

  // --- Initialize the store with the fetched product ---
  // When product data loads from React Query, set it in the Zustand store.
  // This triggers the store's setProduct which resets all other state,
  // ensuring a clean configurator session.
  //
  // WHY CHECK storeProduct?.id !== product?.id:
  // Without this guard, the effect would re-run on every render (since
  // product is a new object reference from React Query each time) and
  // reset the user's selections. We only want to set the product when
  // it's genuinely a different product (or the first load).
  useEffect(() => {
    if (product && storeProduct?.id !== product.id) {
      setProduct(product);
    }
  }, [product, storeProduct?.id, setProduct]);

  // --- Clean up on unmount ---
  // When the user navigates away from the configurator (back button,
  // tab switch), reset the store to prevent stale state if they
  // return to configure a different product.
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // --- Build step labels for the progress bar ---
  // Memoized because it only changes when the product changes.
  const stepLabels = useMemo(() => {
    if (!product) return [];
    return [
      "Fabric",
      ...product.option_groups.map(formatOptionGroupTitle),
      "Review",
    ];
  }, [product]);

  // --- Build completed steps set for the progress bar ---
  // A step is "completed" when the user has made a selection, not because
  // they've navigated past it. The configurator is an unordered checklist:
  // every step needs a selection, but the order doesn't matter.
  // Step 0 = fabric, steps 1..N = option groups, last step (review) is
  // never "completed" — it's the final action, not a selection.
  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    if (!product) return completed;
    if (fabric) completed.add(0);
    product.option_groups.forEach((group, i) => {
      if (selectedOptions[group]) completed.add(i + 1);
    });
    return completed;
  }, [product, fabric, selectedOptions]);

  // --- Loading state ---
  if (productLoading || optionsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading configurator...</Text>
      </View>
    );
  }

  // --- Error state: product not found ---
  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Product not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // --- Render the current step ---
  const renderStep = () => {
    // Step 0: Fabric selection
    if (currentStep === 0) {
      return (
        <FabricSelectionStep
          selectedFabric={fabric}
          onSelectFabric={setFabric}
        />
      );
    }

    // Last step: Review summary
    if (isReviewStep) {
      return (
        <ReviewSummary
          product={product}
          fabric={fabric}
          selectedOptions={selectedOptions}
          customerNotes={customerNotes}
          onChangeNotes={setCustomerNotes}
          onGoToStep={goToStep}
        />
      );
    }

    // Middle steps: Option groups
    if (currentOptionGroup && groupedOptions) {
      const options = groupedOptions[currentOptionGroup] ?? [];
      return (
        <OptionStep
          title={formatOptionGroupTitle(currentOptionGroup)}
          options={options}
          selectedOption={selectedOptions[currentOptionGroup]}
          onSelectOption={(option) => selectOption(currentOptionGroup, option)}
        />
      );
    }

    return null;
  };

  // --- Determine button states ---
  const isFirstStep = currentStep === 0;
  // Steps are freely navigable — customers can skip ahead and come back
  // in any order. The only gate is on the review step: action buttons are
  // disabled until every step has a selection (fabric + all option groups).
  const allOptionsSelected =
    product?.option_groups?.every((group) => !!selectedOptions[group]) ?? false;
  const isReviewReady = isReviewStep && fabric && allOptionsSelected;
  const isNextDisabled = isReviewStep && !isReviewReady;

  // --- Format price for confirmation dialog ---
  const formatPrice = (cents: number) => {
    const prefix = cents < 0 ? "-" : "";
    return `${prefix}$${(Math.abs(cents) / 100).toFixed(2)}`;
  };

  // --- Add to Cart handler ---
  // Adds the configured item to the cart Zustand store and navigates
  // back to the products tab for continued shopping.
  const handleAddToCart = () => {
    if (!fabric || !product) return;
    addToCart({
      product,
      fabric,
      selectedOptions,
      customerNotes,
    });
    // Reset configurator and navigate to products tab
    reset();
    router.back();

    // Show a brief toast confirming the item was added — supplements the
    // cart tab badge update with an explicit textual confirmation so the
    // customer knows the action succeeded before the badge catches their eye.
    Toast.show({
      type: "success",
      text1: "Added to cart",
      visibilityTime: 2000,
    });
  };

  // --- Express checkout handler ---
  // Shows a confirmation dialog, then creates the order directly.
  // Button is disabled while mutation is in-flight to prevent double-taps.
  const handlePlaceOrderNow = () => {
    if (!fabric || !product || !session) return;

    const totalPrice = calculatePrice(
      product.base_price,
      fabric.price_per_meter,
      product.fabric_meters,
      selectedOptions,
    );

    Alert.alert("Place Order", `Place order for ${formatPrice(totalPrice)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Place Order",
        onPress: () => {
          createOrderMutation.mutate(
            {
              profileId: session.user.id,
              productId: product.id,
              fabricId: fabric.id,
              chosenOptions: selectedOptions,
              basePrice: product.base_price,
              fabricPricePerMeter: fabric.price_per_meter,
              fabricMeters: product.fabric_meters,
              customerNotes,
            },
            {
              onSuccess: () => {
                reset();
                router.replace("/order-success");
              },
              onError: () => {
                Alert.alert(
                  "Order Failed",
                  "Could not place your order. Please try again.",
                );
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Step content — fills the remaining space */}
      <View style={styles.stepContent}>{renderStep()}</View>

      {/* Navigation buttons — fixed at the bottom */}
      <View style={styles.bottomBar}>
        {isReviewStep ? (
          // Review step: "Add to Cart" (primary) + "Place Order Now" (secondary link)
          // WHY "Add to Cart" IS PRIMARY:
          // The app is designed for bespoke orders where customers often order
          // multiple items together (suit + shirts for a wedding). Making cart
          // the default flow encourages this. Express checkout is available
          // for customers who want just one item.
          <View style={styles.navRow}>
            <Pressable
              style={styles.navButtonSecondary}
              onPress={prevStep}
              accessibilityRole="button"
              accessibilityLabel="Go to previous step"
            >
              <Text style={styles.navButtonSecondaryText}>Back</Text>
            </Pressable>

            <Pressable
              style={[
                styles.navButtonPrimary,
                !isReviewReady && styles.navButtonDisabled,
              ]}
              onPress={handleAddToCart}
              disabled={!isReviewReady}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
            >
              <Text
                style={[
                  styles.navButtonPrimaryText,
                  !isReviewReady && styles.navButtonDisabledText,
                ]}
              >
                Add to Cart
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.navRow}>
            {isFirstStep ? (
              // First step shows "Cancel" to exit the configurator
              <Pressable
                style={styles.navButtonSecondary}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Cancel configuration"
              >
                <Text style={styles.navButtonSecondaryText}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.navButtonSecondary}
                onPress={prevStep}
                accessibilityRole="button"
                accessibilityLabel="Go to previous step"
              >
                <Text style={styles.navButtonSecondaryText}>Back</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.navButtonPrimary}
              onPress={nextStep}
              accessibilityRole="button"
              accessibilityLabel="Next"
            >
              <Text style={styles.navButtonPrimaryText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Express checkout link — only on review step, below the main buttons */}
        {isReviewStep && (
          <Pressable
            style={styles.expressCheckoutLink}
            onPress={handlePlaceOrderNow}
            disabled={!isReviewReady || createOrderMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Place order now"
          >
            <Text
              style={[
                styles.expressCheckoutText,
                (!isReviewReady || createOrderMutation.isPending) &&
                  styles.expressCheckoutDisabled,
              ]}
            >
              {createOrderMutation.isPending
                ? "Placing Order..."
                : "Place Order Now"}
            </Text>
          </Pressable>
        )}

        {/* Progress bar below nav buttons — positioned at the bottom for
          easy thumb access. Tapping any step (including Review) lets the
          customer jump directly without using Back/Next repeatedly. */}
        <ProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
          completedSteps={completedSteps}
          onGoToStep={goToStep}
        />
      </View>

      {/* WhatsApp support FAB — pre-filled with the product being configured */}
      <SupportFAB
        context={{
          screen: "configurator",
          productName: product?.name ?? "product",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  // Fixed bottom bar containing nav buttons + progress bar.
  // WHY FIXED AT BOTTOM (NOT INLINE WITH CONTENT):
  // The step content scrolls (fabric grid, option grid). If the buttons
  // scrolled with the content, the user would have to scroll to the bottom
  // every time they want to advance. Fixed bottom buttons are the standard
  // pattern for multi-step flows (checkout, onboarding, etc.).
  //
  // WHY PROGRESS BAR AT THE BOTTOM:
  // Placing the progress bar below the nav buttons puts it in the natural
  // thumb zone on mobile. The customer can tap any step (including Review)
  // without reaching to the top of the screen. This also keeps the content
  // area taller — no progress bar eating into the fabric/option grid space.
  bottomBar: {
    flexShrink: 0, // Never compress — always show full nav buttons + progress bar
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  navRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  navButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  navButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  navButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
    alignItems: "center",
  },
  navButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  navButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  navButtonDisabledText: {
    color: "#9ca3af",
  },
  // Express checkout is a text link below the main buttons — secondary
  // action that doesn't compete visually with "Add to Cart".
  expressCheckoutLink: {
    paddingVertical: 10,
    alignItems: "center",
  },
  expressCheckoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
  expressCheckoutDisabled: {
    color: "#9ca3af",
  },
});
