import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookConfig, WebhookDeliveryLog } from "../../types";
import { WebhooksTab } from "./WebhooksTab";

const testMerchantWebhook = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  default: {
    updateMerchantWebhooks: vi.fn(),
    testMerchantWebhook,
    rotateMerchantWebhookSecret: vi.fn(),
  },
}));

describe("WebhooksTab", () => {
  beforeEach(() => {
    testMerchantWebhook.mockReset();
  });

  it("appends a delivered log using the latest parent-owned logs", async () => {
    const initialLogs: WebhookDeliveryLog[] = [
      {
        id: "older",
        event: "order.created",
        trackingNumber: "TEST-OLDER",
        status: 202,
        statusText: "Accepted",
        timestamp: "2026-11-20T00:00:00Z",
        durationMs: 15,
        deliveryStatus: "delivered",
        attemptNumber: 1,
        payloadSummary: "{}",
      },
    ];
    const newLog: WebhookDeliveryLog = {
      id: "new",
      event: "order.delivered",
      trackingNumber: "TEST-NEW",
      status: 202,
      statusText: "Accepted",
      timestamp: "2026-11-20T00:01:00Z",
      durationMs: 20,
      deliveryStatus: "delivered",
      attemptNumber: 1,
      payloadSummary: "{}",
    };
    const latestLog: WebhookDeliveryLog = {
      ...initialLogs[0],
      id: "latest",
      trackingNumber: "TEST-LATEST",
    };
    const config: WebhookConfig = {
      targetUrl: "",
      isActive: false,
      subscribedEvents: [],
      secretConfigured: false,
    };
    const onLogsChange = vi.fn();
    testMerchantWebhook.mockResolvedValue({ log: newLog, message: "Accepted" });

    render(
      <WebhooksTab
        merchantId="merchant-test"
        initialConfig={config}
        initialLogs={initialLogs}
        onConfigChange={vi.fn()}
        onLogsChange={onLogsChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Test Webhook" }));

    await waitFor(() => expect(onLogsChange).toHaveBeenCalledOnce());
    const updateLogs = onLogsChange.mock.calls[0][0];
    expect(typeof updateLogs).toBe("function");
    expect(updateLogs([latestLog])).toEqual([newLog, latestLog]);
  });
});
