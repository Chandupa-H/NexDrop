/**
 * NexDrop Centralized API Client
 * Connects frontend to the FastAPI modular monolith backend.
 */

import type {
  MerchantRegisterRequest,
  MerchantRegistrationResponse,
  MerchantStatusResponse,
} from "@/features/merchants";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc: string[] }>;
  message?: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data: ApiErrorResponse;

  constructor(status: number, message: string, data: ApiErrorResponse = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = data.code;
    this.data = data;
  }
}

export interface HealthStatus {
  status: string;
  service?: string;
  version?: string;
  environment?: string;
}

export interface PriceEstimateRequest {
  tier_name?: string;
  distance_km: number;
  weight_kg: number;
}

export interface PriceEstimateResponse {
  tier_name: string;
  distance_km: number;
  weight_kg: number;
  base_rate: number;
  distance_cost: number;
  weight_cost: number;
  total_price: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Add 8-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
      cache: options.cache || "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: ApiErrorResponse = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const errorMessage =
        typeof errorData.detail === "string"
          ? errorData.detail
          : errorData.message || `Request failed with status ${response.status}`;

      throw new ApiError(response.status, errorMessage, errorData);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timeout - server did not respond within 8 seconds");
    }

    const rawMsg = (error as Error).message || "";
    if (rawMsg === "Failed to fetch" || rawMsg.includes("Failed to fetch")) {
      throw new ApiError(
        503,
        "Cannot connect to the NexDrop backend server. Please verify the backend is running on http://localhost:8000."
      );
    }

    throw new ApiError(500, rawMsg || "Network error communicating with backend");
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  // Health check helper
  getHealth: () => apiClient.get<HealthStatus>("/health"),

  // Instant pricing estimate helper
  getPricingEstimate: (data: PriceEstimateRequest) =>
    apiClient.post<PriceEstimateResponse>("/pricing/estimate", data),

  // ---------------------------------------------------------------------------
  // Merchant — Registration & Approval
  // ---------------------------------------------------------------------------

  /** Submit a new merchant registration application. */
  registerMerchant: (data: MerchantRegisterRequest) =>
    apiClient.post<MerchantRegistrationResponse>("/merchants/register", data),

  /** Check an applicant's approval status by their merchant ID. */
  getMerchantStatus: (merchantId: number) =>
    apiClient.get<MerchantStatusResponse>(`/merchants/${merchantId}/status`),

  // ---------------------------------------------------------------------------
  // Part 4: Merchant API Authentication & Security
  // ---------------------------------------------------------------------------

  /** Fetch live & test API keys, client ID, secret, and rate limits. */
  getMerchantCredentials: (merchantId: number = 1) =>
    apiClient.get<any>(`/merchants/${merchantId}/credentials`),

  /** Rotate/regenerate an API key or client secret. */
  regenerateApiKey: (merchantId: number = 1, keyType: "live" | "test" | "secret" = "live") =>
    apiClient.post<any>(`/merchants/${merchantId}/credentials/regenerate`, { key_type: keyType }),

  /** Verify whether an API key is valid and authorized. */
  verifyApiKey: (apiKey: string) =>
    apiClient.post<any>("/merchants/verify-key", { api_key: apiKey }),

  /** Create a delivery order using merchant API key authentication. */
  createDeliveryViaApi: (data: any, apiKey: string) =>
    apiClient.post<any>("/merchants/deliveries", data, {
      headers: { "X-API-Key": apiKey },
    }),

  /** List deliveries belonging to the authenticated merchant. */
  getMerchantDeliveries: (apiKey: string) =>
    apiClient.get<any[]>("/merchants/deliveries", {
      headers: { "X-API-Key": apiKey },
    }),

  // ---------------------------------------------------------------------------
  // Part 5: Merchant Webhooks
  // ---------------------------------------------------------------------------

  /** Fetch current webhook URL, secret token, and subscribed events. */
  getMerchantWebhookConfig: (merchantId: number = 1) =>
    apiClient.get<any>(`/webhooks/merchant/${merchantId}/config`),

  /** Save webhook endpoint URL and event subscriptions. */
  saveMerchantWebhookConfig: (merchantId: number = 1, data: any) =>
    apiClient.post<any>(`/webhooks/merchant/${merchantId}/config`, data),

  /** Retrieve recent webhook dispatch logs with latency & status codes. */
  getMerchantWebhookLogs: (merchantId: number = 1) =>
    apiClient.get<any[]>(`/webhooks/merchant/${merchantId}/logs`),

  /** Trigger an instantaneous test ping with HMAC-SHA256 signature to target URL. */
  sendTestWebhookPing: (data: { target_url: string; secret_key?: string; event?: string; tracking_number?: string }) =>
    apiClient.post<any>("/webhooks/test-ping", data),
};

export default apiClient;
