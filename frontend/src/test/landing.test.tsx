import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

describe("NexDrop UI Components", () => {
  it("renders Button with primary styling", () => {
    render(<Button variant="primary">Track Parcel</Button>);
    const button = screen.getByRole("button", { name: /track parcel/i });
    expect(button).toBeInTheDocument();
  });

  it("renders Badge with custom variants", () => {
    render(<Badge variant="lime">Live Delivery</Badge>);
    expect(screen.getByText("Live Delivery")).toBeInTheDocument();
  });

  it("renders Card component correctly", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Parcel #123</CardTitle>
        </CardHeader>
        <CardContent>In Transit</CardContent>
      </Card>
    );
    expect(screen.getByText("Parcel #123")).toBeInTheDocument();
    expect(screen.getByText("In Transit")).toBeInTheDocument();
  });
});

describe("NexDrop Centralized API Client", () => {
  it("builds correct health check request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "healthy", service: "NexDrop API" }),
    });
    global.fetch = mockFetch;

    const data = await apiClient.getHealth();
    expect(data.status).toBe("healthy");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({ method: "GET" })
    );
  });
});
