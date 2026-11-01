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
  password: string;
  confirm_password: string;
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
