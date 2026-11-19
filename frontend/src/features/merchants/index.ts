// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ApprovalStatus = "pending" | "approved" | "rejected";

// ---------------------------------------------------------------------------
// Core merchant profile (matches MerchantResponse from backend)
// ---------------------------------------------------------------------------

export interface MerchantProfile {
  id: number;
  user_id: number;
  business_name: string;
  registration_number: string;
  contact_phone: string;
  business_address: string;
  business_type?: string;
  website_url?: string;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  api_key?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Registration form payload (matches MerchantRegisterRequest from backend)
// ---------------------------------------------------------------------------

export interface MerchantRegisterRequest {
  // Account
  email: string;
  full_name: string;
  password?: string;
  confirm_password?: string;
  role_designation?: string;
  direct_phone?: string;
  // Business
  business_name: string;
  registration_number: string;
  contact_phone: string;
  business_address: string;
  business_type?: string;
  website_url?: string;
}

// ---------------------------------------------------------------------------
// Response after registration submission
// ---------------------------------------------------------------------------

export interface MerchantRegistrationResponse {
  merchant_id: number;
  message: string;
  approval_status: ApprovalStatus;
}

// ---------------------------------------------------------------------------
// Status check (public, minimal)
// ---------------------------------------------------------------------------

export interface MerchantStatusResponse {
  merchant_id: number;
  business_name: string;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
}

// ---------------------------------------------------------------------------
// Dashboard exports
// ---------------------------------------------------------------------------

export * from "./types";
export * from "./data/mock-merchant-data";
export * from "./config/dashboard.config";
export { MerchantDashboardView } from "./components/MerchantDashboardView";
export { MerchantProfileView } from "./components/MerchantProfileView";
export { MerchantTopbarUser } from "./components/MerchantTopbarUser";
export { ParcelDetailModal } from "./components/ParcelDetailModal";
