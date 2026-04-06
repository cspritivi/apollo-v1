/**
 * Alteration Request Screen — lets customers submit an alteration for a delivered order.
 *
 * NAVIGATION: Pushed from the Order Detail screen when the order status is DELIVERED.
 * Receives `orderId` as a search param. After successful submission, navigates back
 * to the order detail screen where the new alteration will appear in the list.
 *
 * WHY THIS IS A SCREEN (not a modal):
 * Alteration requests require text input (description, notes). Modals with keyboards
 * are awkward on mobile — the modal shifts up, content gets cramped, and dismissal
 * gestures conflict with scrolling. A full screen gives the customer room to type
 * and review before submitting.
 *
 * CHARGE AMOUNT:
 * Currently hardcoded to 0. In the future, the tailor will set the charge after
 * reviewing the request (via Supabase dashboard). The customer sees the charge
 * on the alteration detail screen once the tailor updates it. This avoids the
 * complexity of a pricing engine for alterations at this stage.
 */

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSession } from "@/hooks/useSession";
import { useCreateAlteration } from "@/features/alterations/hooks";
import AlterationRequestForm from "@/features/alterations/components/AlterationRequestForm";

export default function AlterationRequestScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { session } = useSession();
  const router = useRouter();

  const { mutate: submitAlteration, isPending } = useCreateAlteration();

  const handleSubmit = ({
    description,
    customerNotes,
  }: {
    description: string;
    customerNotes: string;
  }) => {
    if (!session?.user?.id || !orderId) return;

    submitAlteration(
      {
        orderId,
        profileId: session.user.id,
        description,
        chargeAmount: 0, // Tailor sets the charge after reviewing the request
        customerNotes,
      },
      {
        onSuccess: () => {
          Alert.alert(
            "Request Submitted",
            "Your alteration request has been sent to the tailor. You can track its status on the order detail screen.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        },
        onError: (err) => {
          Alert.alert(
            "Request Failed",
            err.message || "Something went wrong. Please try again.",
          );
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instruction header */}
        <View style={styles.header}>
          <Text style={styles.title}>What needs to be changed?</Text>
          <Text style={styles.subtitle}>
            Describe the alterations you need. The tailor will review your
            request and provide a quote.
          </Text>
        </View>

        {/* Form component handles validation and field state */}
        <AlterationRequestForm onSubmit={handleSubmit} isPending={isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
});
