/**
 * WhatsApp support URL builder with contextual message prefill.
 *
 * WHY WhatsApp (not a custom chat):
 * Small tailoring businesses already use WhatsApp for customer communication.
 * No chatbot infrastructure or support ticket system needed. Customers get
 * a real human response immediately. Works internationally.
 *
 * WHY PREFILLED MESSAGES:
 * Context-aware prefill (order ID, product name, screen context) saves the
 * customer from explaining their situation from scratch. The tailor sees the
 * relevant details immediately, reducing back-and-forth.
 */

import { Linking, Alert } from "react-native";

/**
 * Read the WhatsApp phone number at call time (not module load time)
 * so tests can override process.env after import.
 */
function getSupportPhone(): string {
  return process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? "";
}

/** Context types for building prefilled messages */
export type SupportContext =
  | { screen: "configurator"; productName: string }
  | { screen: "order-detail"; orderId: string; orderStatus: string }
  | { screen: "general" };

/**
 * Build the prefilled WhatsApp message based on the current screen context.
 */
function buildMessage(context: SupportContext): string {
  switch (context.screen) {
    case "configurator":
      return `Hi, I have a question about configuring my ${context.productName}`;
    case "order-detail":
      return `Hi, I have a question about order #${context.orderId} (status: ${context.orderStatus})`;
    case "general":
      return "Hi, I have a question about my order";
  }
}

/**
 * Open WhatsApp with a prefilled support message. Falls back to showing
 * the phone number if WhatsApp is not installed.
 */
export async function openWhatsAppSupport(
  context: SupportContext,
): Promise<void> {
  const phone = getSupportPhone();
  if (!phone) return;

  const message = encodeURIComponent(buildMessage(context));
  const url = `https://wa.me/${phone}?text=${message}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback — show the phone number so the customer can contact via SMS or call
    Alert.alert("WhatsApp not available", `You can reach us at +${phone}`, [
      { text: "OK" },
    ]);
  }
}
