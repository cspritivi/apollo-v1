/**
 * Tests for WhatsApp support URL builder.
 *
 * Tests the message prefill logic for each screen context. Linking calls
 * are mocked since we can't actually open WhatsApp in a test environment.
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
});
afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("openWhatsAppSupport", () => {
  it("opens WhatsApp with configurator context", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await openWhatsAppSupport({
      screen: "configurator",
      productName: "Classic Suit",
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/"),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("configuring%20my%20Classic%20Suit"),
    );
  });

  it("opens WhatsApp with order-detail context", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await openWhatsAppSupport({
      screen: "order-detail",
      orderId: "abc-123",
      orderStatus: "IN_PRODUCTION",
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("order%20%23abc-123"),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("IN_PRODUCTION"),
    );
  });

  it("opens WhatsApp with general context", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await openWhatsAppSupport({ screen: "general" });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining("question%20about%20my%20order"),
    );
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
