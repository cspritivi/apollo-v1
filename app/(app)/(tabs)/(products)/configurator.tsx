import { useEffect, useMemo, useRef, useState } from "react";
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
  useFabric,
  useProduct,
  useProductOptions,
} from "@/features/catalog/hooks";
import { useConfiguratorStore } from "@/stores/configuratorStore";
import { useConfiguratorSnapshotStore } from "@/stores/configuratorSnapshotStore";
import { useCartStore } from "@/stores/cartStore";
import { useCreateOrder } from "@/features/orders/hooks";
import { useSession } from "@/hooks/useSession";
import { calculatePrice } from "@/features/orders/utils/calculatePrice";
import { buildHydratedConfig } from "@/features/configurator/utils/buildHydratedConfig";
import Toast from "react-native-toast-message";
import ProgressBar from "@/features/configurator/components/ProgressBar";
import FabricSelectionStep from "@/features/configurator/components/FabricSelectionStep";
import OptionStep, {
  formatOptionGroupTitle,
} from "@/features/configurator/components/OptionStep";
import ReviewSummary from "@/features/configurator/components/ReviewSummary";
import SupportFAB from "@/components/SupportFAB";

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
  const { productId, resume } = useLocalSearchParams<{
    productId: string;
    /**
     * "1" -> entry came from the recently viewed row (issue #49). The
     * init effect auto-restores any saved snapshot for this product
     * without prompting. Anything else (or absent) -> entry came from
     * the catalog flow; if a snapshot exists we prompt before
     * overwriting it.
     */
    resume?: string;
  }>();
  const router = useRouter();
  const { session } = useSession();

  // --- Cart store ---
  const addToCart = useCartStore((s) => s.addItem);

  // --- Snapshot store actions (issue #49) ---
  // Save on unmount so the customer can resume an in-progress configuration
  // from the recently viewed row. Clear when the configuration is consumed
  // (cart-add or order placement) so we never show "In Progress" for a draft
  // that has already been used.
  const saveSnapshot = useConfiguratorSnapshotStore((s) => s.saveSnapshot);
  const clearSnapshot = useConfiguratorSnapshotStore((s) => s.clearSnapshot);

  // Consume guard -- flipped to true by handleAddToCart and the order
  // mutation's onSuccess. The unmount cleanup checks it before saving so a
  // just-consumed configuration is never re-saved. Defensive: today reset()
  // already runs before navigation so the cleanup would see empty state, but
  // this protects us if anything async ever lands between consume and unmount.
  const consumedRef = useRef(false);

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
  const hydrate = useConfiguratorStore((s) => s.hydrate);

  // --- Snapshot read for restore decision (issue #49) ---
  // Subscribed reactively so the init effect re-fires once the store
  // rehydrates from AsyncStorage. Selecting by productId (instead of the
  // whole map) keeps unrelated saves from re-rendering this screen.
  const snapshot = useConfiguratorSnapshotStore((s) =>
    productId ? s.snapshots[productId] : undefined,
  );
  const snapshotsHydrated = useConfiguratorSnapshotStore((s) => s.hasHydrated);

  // useFabric MUST be called unconditionally on every render (rules of
  // hooks). When the snapshot has no fabric (or there's no snapshot at
  // all), pass undefined -- the hook short-circuits with `enabled: false`
  // and never fires a request.
  const snapshotFabricId = snapshot?.fabricId ?? undefined;
  const fabricQuery = useFabric(snapshotFabricId);

  // Tracks whether we've made the init decision. Drives the loading
  // gate so the customer never sees a flash of empty/fresh config UI
  // before the resume prompt resolves or auto-restore lands.
  const [isInitialized, setIsInitialized] = useState(false);
  // Separate ref-level guard: we may need to keep waiting on the alert
  // user-tap AFTER deciding to start the init. The state flag drives UI;
  // this ref drives "have we already kicked off init" to prevent the
  // effect from stacking alerts on dependency churn.
  const initStartedRef = useRef(false);

  // --- Single init path replaces the old eager setProduct effect ---
  // Waits for: snapshot store rehydrated + product loaded + grouped options
  // loaded + (if a snapshot fabric is referenced) the fabric query settled.
  // Then runs the decision tree exactly once. Does NOT layer on top of an
  // eager setProduct -- that caused a "fresh config flash" before the
  // restore landed in earlier iterations.
  useEffect(() => {
    if (initStartedRef.current) return;
    if (!productId) return;
    if (!snapshotsHydrated) return;
    if (!product) return;
    if (!groupedOptions) return;

    // If a snapshot referenced a fabric, wait for that query to settle
    // (success OR error). Without this gate the helper would receive
    // undefined and silently drop the fabric even when it exists.
    const needsFabric = snapshotFabricId !== undefined;
    const fabricSettled = fabricQuery.isSuccess || fabricQuery.isError;
    if (needsFabric && !fabricSettled) return;

    initStartedRef.current = true;

    // No snapshot -> classic fresh start.
    if (!snapshot) {
      setProduct(product);
      setIsInitialized(true);
      return;
    }

    const config = buildHydratedConfig(
      snapshot,
      product,
      groupedOptions,
      fabricQuery.data ?? null,
    );

    // Snapshot fully invalidated by catalog changes -> drop and start fresh.
    if (config === null) {
      clearSnapshot(productId);
      setProduct(product);
      setIsInitialized(true);
      return;
    }

    // Came from recently viewed row -> auto-restore (issue #49 spec).
    if (resume === "1") {
      hydrate(config);
      setIsInitialized(true);
      return;
    }

    // Catalog entry path with an existing draft -> ask before overwriting.
    // The loading state stays visible behind the alert until the user
    // picks, so they never see a fresh-config flash mid-decision.
    Alert.alert(
      "Resume your previous configuration?",
      "We saved where you left off last time.",
      [
        {
          text: "Start fresh",
          style: "cancel",
          onPress: () => {
            clearSnapshot(productId);
            setProduct(product);
            setIsInitialized(true);
          },
        },
        {
          text: "Resume",
          onPress: () => {
            hydrate(config);
            setIsInitialized(true);
          },
        },
      ],
      { cancelable: false },
    );
  }, [
    productId,
    snapshotsHydrated,
    snapshot,
    product,
    groupedOptions,
    snapshotFabricId,
    fabricQuery.isSuccess,
    fabricQuery.isError,
    fabricQuery.data,
    resume,
    setProduct,
    hydrate,
    clearSnapshot,
  ]);

  // --- Clean up on unmount: save snapshot if there's anything to save ---
  // If the customer leaves mid-configuration (back button, tab switch), we
  // persist their selections keyed by product id so they can resume later
  // from the recently viewed row. The cleanup reads state via getState()
  // because the closure captures whatever values were live at effect-setup.
  //
  // Skip the save when consumedRef is true (cart-add / order success path).
  // Skip when there's nothing worth saving -- empty state should never
  // create a snapshot, and a saved-then-immediately-evicted entry would
  // pollute the LRU cap pointlessly.
  useEffect(() => {
    return () => {
      if (consumedRef.current) {
        reset();
        return;
      }

      const state = useConfiguratorStore.getState();
      const hasSelections =
        state.fabric !== null ||
        Object.keys(state.selectedOptions).length > 0 ||
        state.customerNotes.trim().length > 0;

      if (state.product && hasSelections) {
        // Map the in-memory ProductOption objects back down to ids -- the
        // snapshot is intentionally id-only so we never persist stale
        // catalog data (see configuratorSnapshotStore).
        const selectedOptionIds: Record<string, string> = {};
        for (const [group, option] of Object.entries(state.selectedOptions)) {
          selectedOptionIds[group] = option.id;
        }
        saveSnapshot(state.product.id, {
          fabricId: state.fabric?.id ?? null,
          selectedOptionIds,
          currentStep: state.currentStep,
          customerNotes: state.customerNotes,
          savedAt: Date.now(),
        });
      }

      reset();
    };
  }, [reset, saveSnapshot]);

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
  // Also gates on isInitialized so the customer never sees a flash of
  // empty/fresh config UI before the snapshot restore decision lands
  // (or before the resume prompt resolves).
  if (productLoading || optionsLoading || !isInitialized) {
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
    // Cart add is synchronous (Zustand setState) so the configuration is
    // consumed immediately. Clear the persisted snapshot and flag the
    // unmount cleanup not to re-save it.
    consumedRef.current = true;
    clearSnapshot(product.id);
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
                // Order placed successfully -- the configuration is
                // consumed. Clear the persisted snapshot ONLY here, never
                // before the mutation, so a server failure leaves the
                // customer's draft intact and they can retry without
                // losing state.
                consumedRef.current = true;
                clearSnapshot(product.id);
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

      {/* WhatsApp support FAB — pre-filled with the product being configured.
        Fabric and step label are included when available so the tailor sees
        exactly where the customer is in the flow. stepLabels reuses the
        same array driving the progress bar above. */}
      <SupportFAB
        context={{
          screen: "configurator",
          productName: product?.name ?? "product",
          fabricName: fabric?.name,
          stepLabel: stepLabels[currentStep],
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
