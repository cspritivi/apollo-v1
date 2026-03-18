import { View, Text, Pressable, StyleSheet } from "react-native";

/**
 * ProgressBar — visual step indicator for the configurator wizard.
 *
 * Shows a row of numbered circles connected by lines. The current step
 * is highlighted in indigo, completed steps are filled, and future steps
 * are grey outlines. Each step is tappable to allow direct navigation.
 *
 * WHY TAPPABLE STEPS (NOT JUST NEXT/PREV):
 * Power users who've been through the configurator before shouldn't have
 * to click "Back" five times to change their fabric. Tapping a step in
 * the progress bar is a well-established pattern (checkout flows, multi-step
 * forms). First-time users still use Next/Back — the progress bar is a
 * shortcut, not the primary navigation.
 *
 * INTERVIEW TALKING POINT:
 * "The progress bar is a controlled component — it receives the current step
 * and total steps as props and calls onGoToStep when tapped. It doesn't own
 * any state. This makes it reusable: the same component could work in any
 * multi-step flow (order checkout, onboarding wizard, etc.)."
 */

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  /** Labels for each step (e.g., ["Fabric", "Collar", "Cuff", ..., "Review"]) */
  stepLabels: string[];
  onGoToStep: (step: number) => void;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
  onGoToStep,
}: ProgressBarProps) {
  if (totalSteps === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <View key={index} style={styles.stepWrapper}>
              {/* Step circle + connecting line */}
              <View style={styles.stepRow}>
                <Pressable
                  onPress={() => onGoToStep(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${index + 1}: ${stepLabels[index] ?? ""}, ${isCurrent ? "current" : isCompleted ? "completed" : "upcoming"}`}
                  hitSlop={4}
                >
                  <View
                    style={[
                      styles.circle,
                      isCompleted && styles.circleCompleted,
                      isCurrent && styles.circleCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.circleText,
                        (isCompleted || isCurrent) && styles.circleTextActive,
                      ]}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </Text>
                  </View>
                </Pressable>

                {/* Connecting line between steps — omitted after the last step */}
                {!isLast && (
                  <View
                    style={[styles.line, isCompleted && styles.lineCompleted]}
                  />
                )}
              </View>

              {/* Step label below the circle */}
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isCompleted && styles.labelCompleted,
                ]}
                numberOfLines={1}
              >
                {stepLabels[index] ?? ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepWrapper: {
    flex: 1,
    alignItems: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  circleCompleted: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  circleCurrent: {
    borderColor: "#4f46e5",
    backgroundColor: "#eef2ff", // Indigo-50 — light tint for current step
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
  },
  circleTextActive: {
    color: "#4f46e5",
  },
  // Connecting line stretches to fill the space between circles.
  // flex: 1 makes it expand within the stepRow.
  line: {
    flex: 1,
    height: 2,
    backgroundColor: "#d1d5db",
    marginHorizontal: 2,
  },
  lineCompleted: {
    backgroundColor: "#4f46e5",
  },
  label: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  labelCurrent: {
    color: "#4f46e5",
    fontWeight: "600",
  },
  labelCompleted: {
    color: "#6b7280",
  },
});
