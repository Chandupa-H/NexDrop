"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Stepper } from "@/components/ui/stepper";
import { Modal } from "@/components/ui/modal";
import { TermsOfServiceContent, PrivacyPolicyContent } from "@/components/legal/legal-content";
import { useMerchantRegister } from "@/features/merchants/use-merchant-register";
import type {
  AccountFormData,
  BusinessFormData,
  FormErrors,
} from "@/features/merchants/use-merchant-register";
import type { MerchantRegistrationResponse } from "@/features/merchants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = ["Account Details", "Business Info", "Review & Submit"];

const BUSINESS_TYPE_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "wholesale", label: "Wholesale / Distribution" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "home_garden", label: "Home & Garden" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Step 1 — Account Details
// ---------------------------------------------------------------------------

function StepAccount() {
  const { accountData, setAccountData, accountErrors } = useMerchantRegisterContext();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[#064E3B]">Create your account</h2>
        <p className="text-sm text-[#64748B]">
          These credentials will be used to sign in to your merchant portal.
        </p>
      </div>

      <Input
        id="full-name"
        label="Full Name"
        placeholder="e.g. Kavindu Perera"
        required
        autoComplete="name"
        value={accountData.full_name}
        onChange={(e) => setAccountData((d) => ({ ...d, full_name: e.target.value }))}
        error={accountErrors.full_name}
      />

      <Input
        id="email"
        label="Email Address"
        type="email"
        placeholder="you@yourbusiness.com"
        required
        autoComplete="email"
        value={accountData.email}
        onChange={(e) => setAccountData((d) => ({ ...d, email: e.target.value }))}
        error={accountErrors.email}
      />

      <Input
        id="password"
        label="Password"
        type="password"
        placeholder="Min. 8 characters, include a number"
        required
        autoComplete="new-password"
        value={accountData.password}
        onChange={(e) => setAccountData((d) => ({ ...d, password: e.target.value }))}
        error={accountErrors.password}
        helperText="At least 8 characters with one letter and one number."
      />

      <Input
        id="confirm-password"
        label="Confirm Password"
        type="password"
        placeholder="Re-enter your password"
        required
        autoComplete="new-password"
        value={accountData.confirm_password}
        onChange={(e) => setAccountData((d) => ({ ...d, confirm_password: e.target.value }))}
        error={accountErrors.confirm_password}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Business Information
// ---------------------------------------------------------------------------

function StepBusiness() {
  const { businessData, setBusinessData, businessErrors } = useMerchantRegisterContext();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[#064E3B]">Business information</h2>
        <p className="text-sm text-[#64748B]">
          Tell us about your business. Our team will verify these details before approving your account.
        </p>
      </div>

      <Input
        id="business-name"
        label="Business Name"
        placeholder="e.g. Sahan Exports (Pvt) Ltd"
        required
        value={businessData.business_name}
        onChange={(e) => setBusinessData((d) => ({ ...d, business_name: e.target.value }))}
        error={businessErrors.business_name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          id="registration-number"
          label="Business Registration No."
          placeholder="e.g. PV 12345 / 2024"
          required
          value={businessData.registration_number}
          onChange={(e) => setBusinessData((d) => ({ ...d, registration_number: e.target.value }))}
          error={businessErrors.registration_number}
          helperText="As shown on your Certificate of Incorporation."
        />

        <Select
          id="business-type"
          label="Business Type"
          required
          placeholder="Select a type..."
          options={BUSINESS_TYPE_OPTIONS}
          value={businessData.business_type}
          onChange={(e) => setBusinessData((d) => ({ ...d, business_type: e.target.value }))}
          error={businessErrors.business_type}
        />
      </div>

      <Input
        id="contact-phone"
        label="Contact Phone"
        type="tel"
        placeholder="e.g. +94 77 123 4567"
        required
        autoComplete="tel"
        value={businessData.contact_phone}
        onChange={(e) => setBusinessData((d) => ({ ...d, contact_phone: e.target.value }))}
        error={businessErrors.contact_phone}
      />

      <Textarea
        id="business-address"
        label="Business Address"
        placeholder="No. 12, Main Street, Colombo 03, Sri Lanka"
        required
        rows={3}
        value={businessData.business_address}
        onChange={(e) => setBusinessData((d) => ({ ...d, business_address: e.target.value }))}
        error={businessErrors.business_address}
        helperText="Full address including city and postal code."
      />

      <Input
        id="website-url"
        label="Website URL (optional)"
        type="url"
        placeholder="https://www.yourbusiness.com"
        value={businessData.website_url}
        onChange={(e) => setBusinessData((d) => ({ ...d, website_url: e.target.value }))}
        error={businessErrors.website_url}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Review & Submit
// ---------------------------------------------------------------------------

function StepReview() {
  const { accountData, businessData, openLegalModal } = useMerchantRegisterContext();

  const rows: { label: string; value: string }[] = [
    { label: "Full Name", value: accountData.full_name },
    { label: "Email Address", value: accountData.email },
    { label: "Business Name", value: businessData.business_name },
    { label: "Registration No.", value: businessData.registration_number },
    { label: "Business Type", value: BUSINESS_TYPE_OPTIONS.find(o => o.value === businessData.business_type)?.label ?? businessData.business_type },
    { label: "Contact Phone", value: businessData.contact_phone },
    { label: "Business Address", value: businessData.business_address },
    ...(businessData.website_url ? [{ label: "Website", value: businessData.website_url }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[#064E3B]">Review your details</h2>
        <p className="text-sm text-[#64748B]">
          Please confirm everything looks correct before submitting your application.
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F1F5F1]/60 divide-y divide-[#E5E7EB] overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-4 px-4 py-3">
            <span className="text-xs font-medium text-[#64748B] w-36 flex-shrink-0 pt-0.5">
              {row.label}
            </span>
            <span className="text-sm text-[#1F2937] break-words">{row.value || "—"}</span>
          </div>
        ))}
      </div>

      {/* Styled theme alert: no raw ℹ icon, clean forest green / subtle mint palette */}
      <Alert variant="info" title="What happens next?" hideIcon>
        <p className="text-sm text-[#374151] leading-relaxed">
          After submission, our team will review your business details within{" "}
          <strong className="text-[#064E3B] font-semibold">1–2 business days</strong>. You&apos;ll receive an email at{" "}
          <strong className="text-[#064E3B] font-semibold">{accountData.email}</strong> once your account is approved or if we need more information.
        </p>
      </Alert>

      {/* Terms & Privacy agreement alert: no ⚠ hazard icon, popup modal triggers on click */}
      <Alert variant="warning" hideIcon>
        <p className="text-xs text-[#4B5563] leading-relaxed">
          By submitting, you agree to NexDrop&apos;s{" "}
          <button
            type="button"
            onClick={() => openLegalModal("terms")}
            className="underline font-semibold text-[#064E3B] hover:text-[#16A34A] transition-colors cursor-pointer"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => openLegalModal("privacy")}
            className="underline font-semibold text-[#064E3B] hover:text-[#16A34A] transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>.
        </p>
      </Alert>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

function SuccessScreen() {
  const { result, accountData } = useMerchantRegisterContext();

  return (
    <div className="text-center space-y-6 py-4">
      {/* Animated checkmark */}
      <div className="mx-auto h-20 w-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center">
        <svg className="h-10 w-10 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#064E3B]">Application Submitted!</h2>
        <p className="text-sm text-[#64748B] max-w-sm mx-auto">
          Thank you for registering with NexDrop. We&apos;ve received your merchant application and will review it shortly.
        </p>
      </div>

      {/* Reference card */}
      <div className="inline-block mx-auto rounded-xl border-2 border-dashed border-[#16A34A]/40 bg-green-50 px-6 py-4 space-y-1">
        <p className="text-xs text-[#64748B] uppercase tracking-wide font-medium">Application Reference</p>
        <p className="text-2xl font-bold font-mono text-[#064E3B]">
          MER-{String(result?.merchant_id ?? 0).padStart(6, "0")}
        </p>
        <p className="text-xs text-[#64748B]">Keep this number for your records</p>
      </div>

      <div className="space-y-2 text-sm text-[#64748B] max-w-sm mx-auto">
        <p>
          An email confirmation has been sent to{" "}
          <strong className="text-[#1F2937]">{accountData.email}</strong>.
        </p>
        <p>
          Our team will notify you within <strong className="text-[#1F2937]">1–2 business days</strong>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link href="/merchant/application-status">
          <Button variant="secondary" size="md">
            Check Application Status
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="md">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context bridge (avoids prop drilling in a self-contained page)
// ---------------------------------------------------------------------------

interface RegisterContextValue {
  accountData: AccountFormData;
  setAccountData: React.Dispatch<React.SetStateAction<AccountFormData>>;
  businessData: BusinessFormData;
  setBusinessData: React.Dispatch<React.SetStateAction<BusinessFormData>>;
  accountErrors: FormErrors<AccountFormData>;
  businessErrors: FormErrors<BusinessFormData>;
  result: MerchantRegistrationResponse | null;
  openLegalModal: (type: "terms" | "privacy") => void;
}

const RegisterContext = createContext<RegisterContextValue | null>(null);

function useMerchantRegisterContext() {
  const ctx = useContext(RegisterContext);
  if (!ctx) throw new Error("RegisterContext not found");
  return ctx;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MerchantRegisterPage() {
  const [activeLegalModal, setActiveLegalModal] = useState<"terms" | "privacy" | null>(null);

  const {
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
  } = useMerchantRegister();

  const contextValue: RegisterContextValue = {
    accountData,
    setAccountData,
    businessData,
    setBusinessData,
    accountErrors,
    businessErrors,
    result,
    openLegalModal: (type: "terms" | "privacy") => setActiveLegalModal(type),
  };

  return (
    <RegisterContext.Provider value={contextValue}>
      <div className="w-full max-w-xl space-y-6">
        {/* Page heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">
            Merchant Registration
          </h1>
          <p className="text-sm text-[#64748B]">
            Join NexDrop to manage deliveries and grow your business.
          </p>
        </div>

        {/* Stepper — hidden on success */}
        {step < 3 && (
          <Stepper steps={STEPS} currentStep={step} />
        )}

        {/* Card */}
        <Card className="border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
          {step < 3 && (
            <CardHeader className="bg-white border-b border-[#E5E7EB] pb-4">
              <CardTitle className="text-base text-[#064E3B]">
                {step === 0 && "Step 1 — Account Details"}
                {step === 1 && "Step 2 — Business Information"}
                {step === 2 && "Step 3 — Review & Submit"}
              </CardTitle>
              <CardDescription className="text-xs">
                {step === 0 && "Create login credentials for your merchant portal."}
                {step === 1 && "Provide your business details for verification."}
                {step === 2 && "Confirm your information and submit for admin review."}
              </CardDescription>
            </CardHeader>
          )}

          <CardContent className="pt-6 pb-6 px-6 bg-white">
            {step === 0 && <StepAccount />}
            {step === 1 && <StepBusiness />}
            {step === 2 && <StepReview />}
            {step === 3 && <SuccessScreen />}

            {/* Server error */}
            {serverError && step < 3 && (
              <div className="mt-5">
                <Alert variant="error" title="Submission Failed">
                  {serverError}
                </Alert>
              </div>
            )}

            {/* Navigation buttons */}
            {step < 3 && (
              <div className="flex items-center justify-between mt-7 pt-5 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  size="md"
                  onClick={goToPrev}
                  disabled={step === 0 || isSubmitting}
                  type="button"
                >
                  ← Back
                </Button>

                {step < 2 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={goToNext}
                    type="button"
                  >
                    Continue →
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={submitRegistration}
                    disabled={isSubmitting}
                    type="button"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </span>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign-in link */}
        {step < 3 && (
          <p className="text-center text-sm text-[#64748B]">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors">
              Sign in to your portal →
            </Link>
          </p>
        )}

        {/* Legal Modal Popup for Terms of Service and Privacy Policy */}
        <Modal
          isOpen={activeLegalModal !== null}
          onClose={() => setActiveLegalModal(null)}
          title={activeLegalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
          description={
            activeLegalModal === "terms"
              ? "Effective for all registered merchants • Last updated October 2026"
              : "Data governance and privacy standards • Last updated October 2026"
          }
          maxWidth="2xl"
          footer={
            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveLegalModal(null)}
            >
              Close
            </Button>
          }
        >
          {activeLegalModal === "terms" ? (
            <TermsOfServiceContent />
          ) : (
            <PrivacyPolicyContent />
          )}
        </Modal>
      </div>
    </RegisterContext.Provider>
  );
}
