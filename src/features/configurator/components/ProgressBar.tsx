import { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

/**
 * ProgressBar — visual step indicator for the configurator wizard.
 *
 * Shows a row of numbered circles connected by lines. The current step
 * is highlighted in indigo, completed steps show a checkmark, and
 * incomplete steps are grey outlines. Each step is tappable to allow
 * direct navigation.
 *
 * WHY COMPLETION IS SELECTION-BASED (NOT POSITIONAL):
 * The configurator steps are an unordered checklist — the customer needs
 * to make a selection for each step, but the order doesn't matter. A step
 * is "completed" when the user has made a selection (fabric chosen, option
 * picked), not simply because they've navigated past it. This prevents
 * misleading the user into thinking they've finished steps they skipped.
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
  /** Set of step indices that have a selection made (selection-based, not positional) */
  completedSteps: Set<number>;
  onGoToStep: (step: number) => void;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
  completedSteps,
  onGoToStep,
}: ProgressBarProps) {
  if (totalSteps === 0) return null;

  const currentLabel = stepLabels[currentStep] ?? "";

  // Track the center X of each circle relative to the container.
  // We store refs to circle Views and measure them against the container
  // when onLayout fires. This gives pixel-perfect positioning regardless
  // of how lines shift the circles within each stepWrapper.
  const containerRef = useRef<View>(null);
  const circleRefs = useRef<Record<number, View>>({});
  const [circleCenters, setCircleCenters] = useState<Record<number, number>>(
    {},
  );
  const measuredRef = useRef<Record<number, boolean>>({});

  return (
    <View style={styles.container} ref={containerRef}>
      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const isCompleted = completedSteps.has(index);
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
                    ref={(ref) => {
                      if (ref) circleRefs.current[index] = ref;
                    }}
                    onLayout={() => {
                      // Measure this circle's position relative to the
                      // container. Only measure once per step to avoid loops.
                      if (measuredRef.current[index]) return;
                      const circle = circleRefs.current[index];
                      if (!circle || !containerRef.current) return;
                      circle.measureLayout(
                        containerRef.current,
                        (x, _y, width) => {
                          measuredRef.current[index] = true;
                          const center = x + width / 2;
                          setCircleCenters((prev) => {
                            if (prev[index] === center) return prev;
                            return { ...prev, [index]: center };
                          });
                        },
                        () => {},
                      );
                    }}
                    style={[
                      styles.circle,
                      isCompleted && styles.circleCompleted,
                      isCurrent && !isCompleted && styles.circleCurrent,
                      isCurrent && isCompleted && styles.circleCurrentCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Text
                        style={[
                          styles.checkmark,
                          isCurrent && styles.checkmarkCurrent,
                        ]}
                      >
                        ✓
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.circleText,
                          isCurrent && styles.circleTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Connecting line between steps — omitted after the last step */}
                {!isLast && (
                  <View
                    style={[styles.line, isCompleted && styles.lineCompleted]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Current step label — absolutely positioned and centered under the
          current circle. Uses a wide fixed-width Text (120px) offset so its
          center aligns with the measured circle center X. textAlign centers
          the text within that width. */}
      {currentLabel !== "" && circleCenters[currentStep] !== undefined && (
        <Text
          style={[
            styles.labelCurrent,
            { left: circleCenters[currentStep] - 60 },
          ]}
        >
          {currentLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28, // Room for absolute label + equal spacing below it
    backgroundColor: "#fff",
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
  // Completed (not current): light indigo fill with indigo border + checkmark.
  // Uses the app's indigo palette rather than a separate green to stay
  // visually cohesive. The checkmark alone signals completion.
  circleCompleted: {
    backgroundColor: "#eef2ff", // Indigo-50
    borderColor: "#4f46e5",
  },
  // Current step (no selection yet): indigo border, light tint.
  circleCurrent: {
    borderColor: "#4f46e5",
    backgroundColor: "#eef2ff", // Indigo-50
  },
  // Current step AND completed: solid indigo fill to emphasise "you're here
  // and this step is done". The white checkmark on indigo bg is the strongest
  // visual signal in the bar.
  circleCurrentCompleted: {
    borderColor: "#4f46e5",
    backgroundColor: "#4f46e5",
  },
  circleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
  },
  circleTextActive: {
    color: "#4f46e5",
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4f46e5",
  },
  // White checkmark when the current step is completed (solid indigo bg).
  checkmarkCurrent: {
    color: "#fff",
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
  labelCurrent: {
    position: "absolute",
    bottom: 10,
    width: 120,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: "#4f46e5",
  },
});
