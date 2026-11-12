"use client";

import { useState, useCallback } from "react";
import apiClient, { ApiError } from "@/lib/api-client";
import type { MerchantRegisterRequest, MerchantRegistrationResponse } from "@/features/merchants";

// ---------------------------------------------------------------------------
// Form data split by step
// ---------------------------------------------------------------------------

export interface AccountFormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface BusinessFormData {
  business_name: string;
  registration_number: string;
  business_type: string;
  contact_phone: string;
  business_address: string;
  website_url: string;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMerchantRegister() {
  const [step, setStep] = useState(0); // 0 = account, 1 = business, 2 = review
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<MerchantRegistrationResponse | null>(null);

  const [accountData, setAccountData] = useState<AccountFormData>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [businessData, setBusinessData] = useState<BusinessFormData>({
    business_name: "",
    registration_number: "",
    business_type: "",
    contact_phone: "",
    business_address: "",
    website_url: "",
  });

  const [accountErrors, setAccountErrors] = useState<FormErrors<AccountFormData>>({});
  const [businessErrors, setBusinessErrors] = useState<FormErrors<BusinessFormData>>({});

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validateAccount = useCallback((): boolean => {
    const errors: FormErrors<AccountFormData> = {};

    if (!accountData.full_name.trim()) {
      errors.full_name = "Full name is required.";
    } else if (accountData.full_name.trim().length < 2) {
      errors.full_name = "Full name must be at least 2 characters.";
    }

    if (!accountData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!accountData.password) {
      errors.password = "Password is required.";
    } else if (accountData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(accountData.password)) {
      errors.password = "Password must contain at least one letter and one number.";
    }

    if (!accountData.confirm_password) {
      errors.confirm_password = "Please confirm your password.";
    } else if (accountData.password !== accountData.confirm_password) {
      errors.confirm_password = "Passwords do not match.";
    }

    setAccountErrors(errors);
    return Object.keys(errors).length === 0;
  }, [accountData]);

  const validateBusiness = useCallback((): boolean => {
    const errors: FormErrors<BusinessFormData> = {};

    if (!businessData.business_name.trim()) {
      errors.business_name = "Business name is required.";
    }

    if (!businessData.registration_number.trim()) {
      errors.registration_number = "Registration number is required.";
    }

    if (!businessData.business_type) {
      errors.business_type = "Please select a business type.";
    }

    if (!businessData.contact_phone.trim()) {
      errors.contact_phone = "Contact phone is required.";
    } else if (!/^[\d\s\+\-\(\)]{7,20}$/.test(businessData.contact_phone.trim())) {
      errors.contact_phone = "Please enter a valid phone number.";
    }

    if (!businessData.business_address.trim()) {
      errors.business_address = "Business address is required.";
    } else if (businessData.business_address.trim().length < 10) {
      errors.business_address = "Please enter a complete address.";
    }

    if (businessData.website_url && !/^https?:\/\/.+/.test(businessData.website_url)) {
      errors.website_url = "Website URL must start with http:// or https://";
    }

    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  }, [businessData]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const goToNext = useCallback(() => {
    if (step === 0) {
      if (!validateAccount()) return;
    } else if (step === 1) {
      if (!validateBusiness()) return;
    }
    setStep((s) => Math.min(s + 1, 2));
    setServerError(null);
  }, [step, validateAccount, validateBusiness]);

  const goToPrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
    setServerError(null);
  }, []);

  // -------------------------------------------------------------------------
  // Submission
  // -------------------------------------------------------------------------

  const submitRegistration = useCallback(async () => {
    setIsSubmitting(true);
    setServerError(null);

    const payload: MerchantRegisterRequest = {
      ...accountData,
      ...businessData,
      business_type: businessData.business_type || undefined,
      website_url: businessData.website_url || undefined,
    };

    try {
      const response = await apiClient.registerMerchant(payload);
      setResult(response);
      setStep(3); // Final success screen
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [accountData, businessData]);

  return {
    step,
    isSubmitting,
    serverError,
    result,
    accountData,
    setAccountData,
    businessData,
    setBusinessData,
    accountErrors,
    businessErrors,
    goToNext,
    goToPrev,
    submitRegistration,
  };
}
