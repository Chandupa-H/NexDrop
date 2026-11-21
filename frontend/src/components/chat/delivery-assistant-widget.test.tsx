import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeliveryAssistantWidget } from "./delivery-assistant-widget";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    sendAiChat: vi.fn(),
  },
}));

describe("DeliveryAssistantWidget", () => {
  it("renders floating button and opens chat window when clicked", () => {
    render(<DeliveryAssistantWidget />);
    
    // Check floating toggle button exists
    const openBtn = screen.getByLabelText("Open NexDrop AI Delivery Assistant");
    expect(openBtn).toBeInTheDocument();

    // Click to open
    fireEvent.click(openBtn);

    // Chat window should now be visible
    expect(screen.getByText("NexDrop Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask where your parcel is/i)).toBeInTheDocument();
  });

  it("submits user query and renders assistant response with tool data", async () => {
    vi.mocked(apiClient.sendAiChat).mockResolvedValueOnce({
      reply: "Your parcel NXD001225 is currently in transit.",
      tool_used: "track_parcel",
      data: {
        found: true,
        tracking_number: "NXD001225",
        status: "in_transit",
        recipient_name: "Kasun Wickramasinghe",
        current_location: "Colombo Central Hub",
      },
      model: "test-model",
    });

    render(<DeliveryAssistantWidget />);
    fireEvent.click(screen.getByLabelText("Open NexDrop AI Delivery Assistant"));

    const input = screen.getByPlaceholderText(/Ask where your parcel is/i);
    fireEvent.change(input, { target: { value: "Where is my parcel NXD001225?" } });

    const submitBtn = screen.getByLabelText("Send message");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Your parcel NXD001225 is currently in transit/i)).toBeInTheDocument();
      expect(screen.getByText("Kasun Wickramasinghe")).toBeInTheDocument();
    });
  });
});
