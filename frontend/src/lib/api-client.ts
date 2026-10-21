/**
 * NexDrop Centralized API Client
 * Connects frontend to the FastAPI modular monolith backend.
 */

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
};

export default apiClient;
