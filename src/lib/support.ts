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
  | {
      screen: "configurator";
      productName: string;
      // Optional enrichment — included so the tailor immediately sees
      // which fabric the customer picked and which step they're on.
      fabricName?: string;
      stepLabel?: string;
    }
  | {
      screen: "order-detail";
      orderId: string;
      orderStatus: string;
      // Optional enrichment — included so the tailor can answer without
      // looking the order up. Fabric and price are only meaningful when
      // anchored by a product name (see buildMessage rules below).
      productName?: string;
      fabricName?: string;
      // Final price in cents (matches orders.final_price unit). Formatted
      // as `$X.XX` here so callers don't repeat the conversion.
      finalPriceCents?: number;
    }
  | { screen: "general" };

// Presence helpers — treat blank strings and non-finite numbers as absent
// so callers can pass through nullable / fallback values without leaking
// artefacts like `Fabric: ` or `, $NaN` into the message.
const presentStr = (v: string | undefined | null): v is string =>
  typeof v === "string" && v.trim().length > 0;
const presentNum = (v: number | undefined | null): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Build the prefilled WhatsApp message based on the current screen context.
 *
 * Optional enrichment fields are appended only when present. The exact
 * formatting rules live in the issue (#48) and the plan — keeping them
 * here as code, not comments, so behavioural changes show up in the test
 * diffs rather than in prose.
 */
function buildMessage(context: SupportContext): string {
  switch (context.screen) {
    case "configurator": {
      const clauses: string[] = [];
      if (presentStr(context.fabricName))
        clauses.push(`Fabric: ${context.fabricName.trim()}`);
      if (presentStr(context.stepLabel))
        clauses.push(`Step: ${context.stepLabel.trim()}`);
      const suffix = clauses.length ? ` (${clauses.join(", ")})` : "";
      return `Hi, I have a question about configuring my ${context.productName}${suffix}`;
    }
    case "order-detail": {
      // Descriptor is anchored by productName — fabric/price alone are
      // ambiguous fragments without a product to attach them to.
      let descriptor = "";
      if (presentStr(context.productName)) {
        descriptor = ` \u2014 ${context.productName.trim()}`;
        if (presentStr(context.fabricName))
          descriptor += ` in ${context.fabricName.trim()}`;
        if (presentNum(context.finalPriceCents))
          descriptor += `, $${(context.finalPriceCents / 100).toFixed(2)}`;
      }
      return `Hi, I have a question about order #${context.orderId}${descriptor} (status: ${context.orderStatus})`;
    }
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
