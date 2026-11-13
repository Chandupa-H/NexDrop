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

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, (error as Error).message || "Network error communicating with backend");
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
};

export default apiClient;
