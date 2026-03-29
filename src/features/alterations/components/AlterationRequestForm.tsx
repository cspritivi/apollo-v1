/**
 * AlterationRequestForm — presentational form for submitting an alteration request.
 *
 * WHY A SEPARATE COMPONENT (not inline in the screen):
 * Extracting the form makes it testable without mocking Expo Router or
 * useSession. The screen handles navigation and session wiring; this
 * component handles form state, validation, and submit. This matches the
 * pattern used in auth screens (form logic in component, routing in screen).
 *
 * VALIDATION RULES:
 * - Description is required and must be >= 10 characters. Short descriptions
 *   like "fix it" don't give the tailor enough context to estimate the work.
 * - Notes are optional — they're for additional context the customer wants
 *   to share but aren't required for the tailor to act on the request.
 */

import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

// ============================================================================
// TYPES
// ============================================================================

interface AlterationFormData {
  description: string;
  customerNotes: string;
}

interface AlterationRequestFormProps {
  onSubmit: (data: AlterationFormData) => void;
  isPending: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum description length. "Take in waist" is 14 chars — anything shorter
 * is unlikely to be actionable for the tailor.
 */
const MIN_DESCRIPTION_LENGTH = 10;

// ============================================================================
// COMPONENT
// ============================================================================

export default function AlterationRequestForm({
  onSubmit,
  isPending,
}: AlterationRequestFormProps) {
  const [description, setDescription] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    // Don't allow submit while a mutation is in flight
    if (isPending) return;

    const trimmedDescription = description.trim();

    // Validate description length
    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setValidationError(
        `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.`,
      );
      return;
    }

    // Clear any previous validation error and submit
    setValidationError(null);
    onSubmit({
      description: trimmedDescription,
      customerNotes,
    });
  };

  return (
    <View style={styles.container}>
      {/* Description input — the core of the alteration request */}
      <Text style={styles.label}>What needs to be altered?</Text>
      <TextInput
        testID="alteration-description-input"
        style={[styles.input, styles.textArea]}
        placeholder="Describe the alterations needed (e.g., take in waist by 1 inch)"
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          // Clear validation error as user types to avoid stale messages
          if (validationError) setValidationError(null);
        }}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Validation error — shown below description field */}
      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}

      {/* Notes input — optional additional context */}
      <Text style={styles.label}>Additional Notes (optional)</Text>
      <TextInput
        testID="alteration-notes-input"
        style={[styles.input, styles.notesInput]}
        placeholder="Additional notes for the tailor"
        value={customerNotes}
        onChangeText={setCustomerNotes}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      {/* Submit button */}
      <Pressable
        style={[styles.button, isPending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isPending}
      >
        <Text style={styles.buttonText}>
          {isPending ? "Submitting..." : "Submit Request"}
        </Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  textArea: {
    minHeight: 100,
  },
  notesInput: {
    minHeight: 60,
  },
  errorText: {
    fontSize: 13,
    color: "#ef4444",
    marginTop: -12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
