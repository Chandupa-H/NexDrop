/**
 * NexDrop Centralized API Client
 * Connects frontend to the FastAPI modular monolith backend.
 */

import type {
  MerchantRegisterRequest,
  MerchantRegistrationResponse,
  MerchantStatusResponse,
  MerchantOrder,
  MerchantKpis,
  ApiCredentials,
  WebhookConfig,
  WebhookDeliveryLog,
} from "@/features/merchants";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000/api/v1";

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc: string[] }>;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorResponse;

  constructor(status: number, message: string, data: ApiErrorResponse = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
  const endpointPath = endpoint.split("?")[0];
  const requiresCourierAuth =
    endpointPath.startsWith("/courier/") ||
    /^\/deliveries\/[^/]+\/tracking$/.test(endpointPath);
  if (
    requiresCourierAuth &&
    typeof window !== "undefined" &&
    !headers.has("Authorization")
  ) {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new ApiError(401, error.message);
    }
    if (data?.session?.access_token) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    }
  }

  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !headers.has("Authorization")
  ) {
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const {
        data: { session },
      } = await createSupabaseBrowserClient().auth.getSession();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
    } catch {
      // Proceed unauthenticated if no browser session is available.
    }
  }

  // Add 8-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
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
      // Auto-retry with 127.0.0.1 if localhost failed due to Windows IPv6 resolution
      if (url.includes("localhost:8000")) {
        try {
          const fallbackUrl = url.replace("localhost:8000", "127.0.0.1:8000");
          const retryRes = await fetch(fallbackUrl, {
            ...options,
            headers,
            signal: options.signal,
            cache: options.cache || "no-store",
          });
          if (retryRes.ok) return (await retryRes.json()) as T;
        } catch {
          // continue to throw standard ApiError
        }
      }
      throw new ApiError(
        503,
        "Cannot connect to the NexDrop backend server. Please verify the backend is running on http://127.0.0.1:8000."
      );
    }

    throw new ApiError(500, rawMsg || "Network error communicating with backend");
  }
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

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  postForm: <T>(
    endpoint: string,
    body: FormData,
    onUploadProgress?: (percent: number) => void
  ) =>
    new Promise<T>((resolve, reject) => {
      const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.timeout = 120_000;
      xhr.setRequestHeader("Accept", "application/json");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onUploadProgress) {
          onUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = () => reject(new ApiError(500, "Network error communicating with backend"));
      xhr.ontimeout = () => reject(new ApiError(408, "Proof upload timed out"));
      xhr.onload = () => {
        let data: unknown;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          data = {};
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          const errorData = data as ApiErrorResponse;
          const detail = errorData.detail;
          const message = typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((item) => item.msg).join("; ")
              : errorData.message || `Request failed with status ${xhr.status}`;
          reject(new ApiError(xhr.status, message, errorData));
          return;
        }
        resolve(data as T);
      };
      xhr.send(body);
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
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
  getMerchantStatus: (merchantId: number | string) =>
    apiClient.get<MerchantStatusResponse>(`/merchants/${merchantId}/status`),

  /** List all registered merchants (Admin review). */
  listAdminMerchants: (params?: { skip?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiClient.get<any[]>(`/merchants${qs ? `?${qs}` : ""}`);
  },

  /** List pending merchant applications requiring review (Admin). */
  listAdminPendingMerchants: () =>
    apiClient.get<any[]>("/merchants/pending"),

  /** Approve or reject a merchant registration application (Admin). */
  updateMerchantApproval: (
    merchantId: number | string,
    payload: { status: "approved" | "rejected"; rejection_reason?: string }
  ) => apiClient.patch<any>(`/merchants/${merchantId}/approval`, payload),

  // ---------------------------------------------------------------------------
  // Merchant — Dashboard, Orders, Keys, Webhooks
  // ---------------------------------------------------------------------------

  /** Fetch complete merchant dashboard summary (KPIs, recent orders, credentials, webhooks). */
  getMerchantSummary: (merchantId: number | string = "me") =>
    apiClient.get<{
      merchantId: string;
      businessName: string;
      kpis: MerchantKpis;
      recentOrders: MerchantOrder[];
      credentials: ApiCredentials;
      webhookConfig: WebhookConfig;
    }>(`/merchants/${merchantId}/dashboard/summary`),

  /** Fetch merchant delivery KPIs. */
  getMerchantKpis: (merchantId: number | string = "me") =>
    apiClient.get<MerchantKpis>(`/merchants/${merchantId}/kpis`),

  /** List merchant shipment orders with status or search filter. */
  getMerchantOrders: (
    merchantId: number | string = "me",
    params?: { status?: string; search?: string; skip?: number; limit?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "all") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.skip) q.set("skip", String(params.skip));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiClient.get<MerchantOrder[]>(`/merchants/${merchantId}/orders${qs ? `?${qs}` : ""}`);
  },

  /** Get single order details by order ID or tracking number. */
  getMerchantOrder: (merchantId: number | string = "me", orderId: string) =>
    apiClient.get<MerchantOrder>(`/merchants/${merchantId}/orders/${orderId}`),

  /** Create a new shipment order. */
  createMerchantOrder: (
    merchantId: number | string = "me",
    data: {
      recipient_name: string;
      recipient_phone: string;
      delivery_address: string;
      delivery_city: string;
      weight_kg: number;
      dimensions?: string;
      cod_amount?: number;
      is_prepaid?: boolean;
      special_instructions?: string;
    }
  ) => apiClient.post<MerchantOrder>(`/merchants/${merchantId}/orders`, data),

  /** Get merchant API credentials & rate limits. */
  getMerchantCredentials: (merchantId: number | string = "me") =>
    apiClient.get<ApiCredentials>(`/merchants/${merchantId}/credentials`),

  /** Regenerate merchant production or test API key. */
  regenerateApiKey: (merchantId: number | string = "me", keyType: "live" | "test" = "live") =>
    apiClient.post<ApiCredentials>(`/merchants/${merchantId}/credentials/regenerate`, { key_type: keyType }),

  /** Get merchant webhook configuration. */
  getMerchantWebhooks: (merchantId: number | string = "me") =>
    apiClient.get<WebhookConfig>(`/merchants/${merchantId}/webhooks`),

  /** Update merchant webhook configuration. */
  updateMerchantWebhooks: (merchantId: number | string = "me", config: Partial<WebhookConfig>) =>
    apiClient.put<WebhookConfig>(`/merchants/${merchantId}/webhooks`, config),

  /** Send test webhook ping event. */
  testMerchantWebhook: (merchantId: number | string = "me", eventType: string = "order.in_transit") =>
    apiClient.post<{ log: WebhookDeliveryLog; message: string }>(`/merchants/${merchantId}/webhooks/test`, {
      event_type: eventType,
    }),

  /** Get recent webhook delivery logs. */
  getMerchantWebhookLogs: (merchantId: number | string = "me", limit: number = 50) =>
    apiClient.get<WebhookDeliveryLog[]>(`/merchants/${merchantId}/webhooks/logs?limit=${limit}`),
};

export default apiClient;
