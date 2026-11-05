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

export interface CourierRegistrationResponse {
  courier_id: number;
  approval_status: "pending" | "approved" | "rejected";
  message: string;
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
  const timeoutId = setTimeout(() => controller.abort(), options.body instanceof FormData ? 60000 : 8000);
  
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
          : Array.isArray(errorData.detail)
            ? errorData.detail.map((item) => `${item.loc?.[item.loc.length - 1] ?? "Request"}: ${item.msg}`).join(" ")
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
    
    throw new ApiError(500, (error as Error).message || "Network error communicating with backend");
  }
}

function requestFormWithProgress<T>(
  endpoint: string,
  body: FormData,
  onProgress: (loaded: number, total: number) => void
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = 60000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onerror = () => reject(new ApiError(500, "Network error communicating with backend"));
    xhr.ontimeout = () => reject(new ApiError(408, "Request timeout - server did not respond within 60 seconds"));
    xhr.onload = () => {
      let data: ApiErrorResponse = {};
      try {
        data = JSON.parse(xhr.responseText) as ApiErrorResponse;
      } catch {
        data = { message: xhr.statusText };
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = data.detail;
        const message = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => `${item.loc?.[item.loc.length - 1] ?? "Request"}: ${item.msg}`).join(" ")
            : data.message || `Request failed with status ${xhr.status}`;
        reject(new ApiError(xhr.status, message, data));
        return;
      }
      resolve(data as T);
    };
    xhr.send(body);
  });
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

  postForm: <T>(endpoint: string, body: FormData, onProgress?: (loaded: number, total: number) => void) =>
    onProgress
      ? requestFormWithProgress<T>(endpoint, body, onProgress)
      : request<T>(endpoint, { method: "POST", body }),

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

  /** Submit a courier application and its private verification documents. */
  registerCourier: (data: FormData, onProgress?: (loaded: number, total: number) => void) =>
    apiClient.postForm<CourierRegistrationResponse>("/couriers/register", data, onProgress),
};

export default apiClient;
