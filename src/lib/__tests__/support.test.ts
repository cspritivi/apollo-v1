/**
 * Tests for WhatsApp support URL builder.
 *
 * Tests the message prefill logic for each screen context. Linking calls
 * are mocked since we can't actually open WhatsApp in a test environment.
 *
 * Assertions use encoded substring matching (`stringContaining`) rather
 * than full URL equality so the tests stay robust to incidental encoding
 * changes (e.g. whether spaces become `%20` or `+`).
 */

import { Linking, Alert } from "react-native";
import { openWhatsAppSupport } from "../support";

// Mock React Native Linking
jest.mock("react-native", () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Set the env var for tests
const ORIGINAL_ENV = process.env;
beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    EXPO_PUBLIC_SUPPORT_WHATSAPP: "911234567890",
  };
  jest.clearAllMocks();
  (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
});
afterAll(() => {
  process.env = ORIGINAL_ENV;
});

/** Helper — pull the URL from the most recent openURL call. */
function lastUrl(): string {
  const calls = (Linking.openURL as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as string;
}

describe("openWhatsAppSupport — configurator", () => {
  it("falls back to the minimal message when no enrichment is provided", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
    });
    const url = lastUrl();
    expect(url).toContain("wa.me/");
    expect(url).toContain("configuring%20my%20Classic%20Suit");
    // No parenthetical clause when neither enrichment field is present
    expect(url).not.toContain("Fabric");
    expect(url).not.toContain("Step");
  });

  it("includes Fabric and Step when both enrichments are present", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
      fabricName: "Black Wool Crepe",
      stepLabel: "Collar Style",
    });
    const url = lastUrl();
    expect(url).toContain("Fabric%3A%20Black%20Wool%20Crepe");
    expect(url).toContain("Step%3A%20Collar%20Style");
  });

  it("includes only Fabric when stepLabel is absent", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
      fabricName: "Black Wool Crepe",
    });
    const url = lastUrl();
    expect(url).toContain("Fabric%3A%20Black%20Wool%20Crepe");
    expect(url).not.toContain("Step");
  });

  it("includes only Step when fabricName is absent", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
      stepLabel: "Collar Style",
    });
    const url = lastUrl();
    expect(url).toContain("Step%3A%20Collar%20Style");
    expect(url).not.toContain("Fabric");
  });

  it("emits Step: Review on the review step", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
      stepLabel: "Review",
    });
    expect(lastUrl()).toContain("Step%3A%20Review");
  });

  it("treats blank/whitespace strings as absent", async () => {
    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
      fabricName: "   ",
      stepLabel: "",
    });
    const url = lastUrl();
    expect(url).not.toContain("Fabric");
    expect(url).not.toContain("Step");
  });
});

describe("openWhatsAppSupport — order-detail", () => {
  it("falls back to the minimal status-only message when no enrichment is provided", async () => {
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
    });
    const url = lastUrl();
    expect(url).toContain("order%20%23abc-123");
    expect(url).toContain("status%3A%20IN_PRODUCTION");
    // No descriptor without productName
    expect(url).not.toContain("%E2%80%94"); // em dash
  });

  it("includes product, fabric, and price when all are present", async () => {
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
      productName: "Classic Suit",
      fabricName: "Black Wool Crepe",
      finalPriceCents: 54900,
    });
    const url = lastUrl();
    expect(url).toContain("Classic%20Suit");
    expect(url).toContain("in%20Black%20Wool%20Crepe");
    expect(url).toContain("%24549.00"); // $549.00
    expect(url).toContain("status%3A%20IN_PRODUCTION");
  });

  it("includes only the product name when fabric and price are absent", async () => {
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
      productName: "Classic Suit",
    });
    const url = lastUrl();
    expect(url).toContain("%E2%80%94%20Classic%20Suit"); // — Classic Suit
    expect(url).not.toContain("in%20");
    expect(url).not.toContain("%24"); // no $
  });

  it("includes product and price without fabric when fabric is absent", async () => {
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
      productName: "Classic Suit",
      finalPriceCents: 54900,
    });
    const url = lastUrl();
    expect(url).toContain("Classic%20Suit");
    expect(url).toContain("%24549.00");
    expect(url).not.toContain("in%20"); // no fabric clause
  });

  it("omits the descriptor entirely when productName is missing, even if fabric/price are set", async () => {
    // Negative case: fabric and price alone are ambiguous fragments and
    // must not leak into the message without a product to anchor them.
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
      fabricName: "Black Wool Crepe",
      finalPriceCents: 54900,
    });
    const url = lastUrl();
    expect(url).not.toContain("Black%20Wool%20Crepe");
    expect(url).not.toContain("%24549.00");
    expect(url).not.toContain("%E2%80%94"); // no em dash
    // Status clause still present
    expect(url).toContain("status%3A%20IN_PRODUCTION");
  });

  it("treats non-finite finalPriceCents as absent", async () => {
    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
      productName: "Classic Suit",
      finalPriceCents: NaN,
    });
    const url = lastUrl();
    expect(url).toContain("Classic%20Suit");
    expect(url).not.toContain("NaN");
    expect(url).not.toContain("%24");
  });
});

describe("openWhatsAppSupport — general", () => {
  it("opens WhatsApp with the general message", async () => {
    await openWhatsAppSupport({ screen: "general" });
    expect(lastUrl()).toContain("question%20about%20my%20order");
  });

  it("shows fallback alert when WhatsApp is not installed", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await openWhatsAppSupport({ screen: "general" });

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      "WhatsApp not available",
      expect.stringContaining("911234567890"),
      expect.any(Array),
    );
  });
});
