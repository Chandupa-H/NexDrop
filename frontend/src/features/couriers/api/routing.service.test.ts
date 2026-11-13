import { afterEach, describe, expect, it, vi } from "vitest";
import { getShortestDrivingRoute } from "./routing.service";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getShortestDrivingRoute", () => {
  it("times out stalled OSRM requests after eight seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          void url;
          void resolve;
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = getShortestDrivingRoute(
      { lat: 6.9344, lng: 79.8428 },
      { lat: 6.9147, lng: 79.8521 }
    );
    const requestFailure = expect(request).rejects.toThrow(
      "timed out after 8 seconds"
    );
    await vi.advanceTimersByTimeAsync(8_000);

    await requestFailure;
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
