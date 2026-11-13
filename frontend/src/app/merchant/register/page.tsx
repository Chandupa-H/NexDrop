"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
import apiClient from "@/lib/api-client";
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
        <h2 className="text-xl font-bold text-[#064E3B]">Account & Representative Details</h2>
        <p className="text-sm text-[#64748B]">
          Provide your primary contact details to register your merchant application.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          label="Business Email Address"
          type="email"
          placeholder="you@yourbusiness.com"
          required
          autoComplete="email"
          value={accountData.email}
          onChange={(e) => setAccountData((d) => ({ ...d, email: e.target.value }))}
          error={accountErrors.email}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="direct-phone"
          label="Direct Contact Phone"
          placeholder="+94 77 123 4567"
          autoComplete="tel"
          value={accountData.direct_phone}
          onChange={(e) => setAccountData((d) => ({ ...d, direct_phone: e.target.value }))}
          error={accountErrors.direct_phone}
          helperText="Used for courier alerts"
        />

        <Input
          id="role-designation"
          label="Role / Designation in Business"
          placeholder="e.g. Managing Director, Store Owner"
          value={accountData.role_designation}
          onChange={(e) => setAccountData((d) => ({ ...d, role_designation: e.target.value }))}
        />
      </div>
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
    ...(accountData.role_designation ? [{ label: "Role / Designation", value: accountData.role_designation }] : []),
    ...(accountData.direct_phone && accountData.direct_phone.trim() !== "+94" && accountData.direct_phone.trim() !== "+94 " ? [{ label: "Direct Phone", value: accountData.direct_phone }] : []),
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
// Step 4 — Pending Approval & Review Status Screen
// ---------------------------------------------------------------------------

function PendingApprovalScreen() {
  const { result, accountData, businessData } = useMerchantRegisterContext();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>(result?.approval_status || "pending");
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const merchantId = result?.merchant_id;
  const refCode = `MER-${String(merchantId ?? 0).padStart(6, "0")}`;

  const copyReference = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const checkLiveStatus = async () => {
    if (!merchantId) return;
    setChecking(true);
    setStatusFeedback(null);
    try {
      const data = await apiClient.getMerchantStatus(merchantId);
      setLiveStatus(data.approval_status);
      if (data.approval_status === "approved") {
        setStatusFeedback("Great news! An administrator has approved your merchant account.");
      } else if (data.approval_status === "rejected") {
        setStatusFeedback(`Application update: Rejected (${data.rejection_reason || "Please reach out to support"}).`);
      } else {
        setStatusFeedback("Status verified: Your application is currently under admin review.");
      }
    } catch {
      setStatusFeedback("Could not refresh status. Please try again shortly.");
    } finally {
      setChecking(false);
    }
  };

  // If approved by admin
  if (liveStatus === "approved") {
    return (
      <div className="space-y-6 py-4 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center">
          <svg className="h-10 w-10 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#064E3B] text-xs font-semibold">
            <span>✓</span> Application Approved
          </div>
          <h2 className="text-2xl font-bold text-[#064E3B]">Account Approved & Activated!</h2>
          <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
            Congratulations! Your merchant account for <strong>{businessData.business_name || "your business"}</strong> is approved. You can now access your merchant dashboard.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/merchant/dashboard">
            <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold shadow-md">
              Access your dashboard from here →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Status banner */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          Registration Under Review
        </div>

        <h2 className="text-2xl font-bold text-[#064E3B] tracking-tight">
          Application Submitted & Awaiting Approval
        </h2>
        <p className="text-sm text-[#64748B] max-w-md">
          Thank you for applying. Your registration has been received. Our compliance and operations team is currently reviewing your business credentials before unlocking your portal access.
        </p>
      </div>

      {/* Reference ID card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAF8] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#64748B]">
            Application Reference
          </span>
          <button
            type="button"
            onClick={copyReference}
            className="text-xs text-[#064E3B] hover:text-[#16A34A] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copied ? (
              <span className="text-[#16A34A] font-semibold">✓ Copied</span>
            ) : (
              <span>Copy Reference ID</span>
            )}
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-bold text-[#064E3B] tracking-wide">
            {refCode}
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Pending Admin Review
          </span>
        </div>

        <div className="pt-2 border-t border-[#E5E7EB] text-xs text-[#64748B] flex flex-col sm:flex-row justify-between gap-1">
          <span><strong>Business:</strong> {businessData.business_name || "Registered Merchant"}</span>
          <span><strong>Applicant:</strong> {accountData.email}</span>
        </div>
      </div>

      {/* Review Progress Tracker */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#064E3B]">
          Verification Milestones
        </p>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
            <span className="h-5 w-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
              ✓
            </span>
            <div>
              <p className="font-semibold text-[#064E3B]">1. Registration Submitted</p>
              <p className="text-[#4B5563]">Account details, business registration number, and addresses received.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200">
            <span className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
              ⏳
            </span>
            <div>
              <p className="font-semibold text-amber-900">2. Admin Verification (Current Stage)</p>
              <p className="text-amber-800/90">Our administrative compliance team is validating your credentials. Standard reviews conclude within 1–2 business days.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] opacity-75">
            <span className="h-5 w-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
              3
            </span>
            <div>
              <p className="font-semibold text-[#64748B]">3. Portal Access & API Keys Provisioned</p>
              <p className="text-[#64748B]">Once an administrator approves your account, your login will be unlocked and live API keys issued.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live status check feedback alert */}
      {statusFeedback && (
        <Alert variant={liveStatus === "rejected" ? "error" : "info"} hideIcon>
          <p className="text-xs">{statusFeedback}</p>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        <Button
          variant="primary"
          size="md"
          className="w-full flex items-center justify-center gap-2"
          onClick={checkLiveStatus}
          disabled={checking}
          type="button"
        >
          {checking ? "Checking Approval Status…" : "Refresh Approval Status"}
        </Button>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href={`/merchant/application-status?id=${merchantId}`} className="flex-1">
            <Button variant="secondary" size="md" className="w-full">
              View Status Page →
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" size="md" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
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
  const [authChecking, setAuthChecking] = useState(true);
  const [authUser, setAuthUser] = useState<{ email: string; name?: string } | null>(null);
  const [existingApp, setExistingApp] = useState<{
    merchant_id: number;
    business_name?: string;
    email?: string;
    approval_status?: string;
  } | null>(null);

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

  useEffect(() => {
    // 1. Check existing merchant application in localStorage
    try {
      const stored = localStorage.getItem("nexdrop_merchant_application");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.merchant_id) {
          setExistingApp(parsed);
        }
      }
    } catch {}

    // 2. Check Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const email = session.user.email || "";
          const name =
            (session.user.user_metadata?.full_name as string) ||
            (session.user.user_metadata?.name as string) ||
            "";
          setAuthUser({ email, name });
          setAccountData((prev) => ({
            ...prev,
            email: prev.email || email,
            full_name: prev.full_name || name,
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        setAuthChecking(false);
      });
  }, [setAccountData]);

  // If already registered, restrict to one merchant application per user
  if (existingApp && step < 3 && !result) {
    return (
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">
            Merchant Application Status
          </h1>
          <p className="text-sm text-[#64748B]">
            Only one merchant registration is permitted per user account.
          </p>
        </div>

        <Card className="border border-emerald-200 bg-white shadow-sm rounded-xl overflow-hidden p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
            <span className="h-10 w-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-base flex-shrink-0">
              ✓
            </span>
            <div>
              <p className="font-bold text-[#064E3B] text-sm">
                Application Already Submitted
              </p>
              <p className="text-xs text-[#4B5563]">
                Your business <strong>{existingApp.business_name || "Registered Merchant"}</strong> is already registered under Reference ID{" "}
                <span className="font-mono font-semibold text-[#064E3B]">
                  MER-{String(existingApp.merchant_id).padStart(6, "0")}
                </span>.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Link href="/merchant/dashboard" className="block">
              <Button variant="primary" size="lg" className="w-full font-bold shadow-sm">
                Access your dashboard from here →
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link href={`/merchant/application-status?id=${existingApp.merchant_id}`} className="flex-1">
                <Button variant="secondary" size="md" className="w-full">
                  Check Approval Status →
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" size="md" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If unauthenticated, gate registration behind sign-in
  if (!authUser && !authChecking && step < 3 && !result) {
    return (
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">
            Merchant Registration
          </h1>
          <p className="text-sm text-[#64748B]">
            Sign in to your NexDrop account to register as a verified merchant.
          </p>
        </div>

        <Card className="border border-[#E5E7EB] bg-white shadow-sm rounded-xl overflow-hidden p-7 sm:p-9 text-center space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#064E3B] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7 text-[#064E3B]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#064E3B] tracking-tight">
              Sign In Required to Register
            </h2>
            <p className="text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
              Merchant registration is linked directly to your user account. Please log in or create an account first to register your business on NexDrop.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/login?redirect=/merchant/register" className="flex-1">
              <Button variant="primary" size="md" className="w-full font-bold shadow-sm">
                Sign In to Continue →
              </Button>
            </Link>
            <Link href="/login?view=sign_up&redirect=/merchant/register" className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                Create New Account
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] text-center text-xs text-[#64748B]">
            <span>
              Already registered?{" "}
              <Link
                href="/merchant/dashboard"
                className="font-semibold text-[#064E3B] hover:text-[#16A34A] transition-colors"
                aria-label="Access your dashboard from here →"
              >
                Access your dashboard from here →
              </Link>
            </span>
          </div>
        </Card>
      </div>
    );
  }

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

        {/* Authenticated user indicator badge */}
        {authUser && step < 3 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl text-xs text-[#064E3B]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>Signed in as <strong>{authUser.email}</strong></span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Single Merchant Allowed
            </span>
          </div>
        )}

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
            {step === 3 && <PendingApprovalScreen />}

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
            <Link
              href="/merchant/dashboard"
              className="font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors"
              aria-label="Access your dashboard from here →"
            >
              Access your dashboard from here →
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
