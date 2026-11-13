"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import apiClient, { ApiError } from "@/lib/api-client";
import type { MerchantStatusResponse, ApprovalStatus } from "@/features/merchants";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; variant: "success" | "secondary" | "destructive"; description: string; icon: string }
> = {
  pending: {
    label: "Under Review",
    variant: "secondary",
    description:
      "Your registration has been submitted and is currently in the verification queue. Our administrative compliance team is validating your business details before activating portal access. This typically takes 1–2 business days.",
    icon: "⏳",
  },
  approved: {
    label: "Approved & Active",
    variant: "success",
    description:
      "Congratulations! Your merchant account has been verified and approved by the admin team. Your login credentials and live API keys are now active.",
    icon: "✓",
  },
  rejected: {
    label: "Not Approved",
    variant: "destructive",
    description:
      "Your application was not approved during administrative verification. Please review the note below or contact support for guidance.",
    icon: "✕",
  },
};

// ---------------------------------------------------------------------------
// Main Content Component
// ---------------------------------------------------------------------------

function ApplicationStatusContent() {
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("id");

  const [merchantId, setMerchantId] = useState(idFromQuery || "");
  const [idError, setIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<MerchantStatusResponse | null>(null);

  const fetchStatus = useCallback(async (targetId: number) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const data = await apiClient.getMerchantStatus(targetId);
      setStatusData(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setServerError(`No application found with ID ${targetId}. Please double-check your reference number.`);
      } else if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("Unable to connect to the server. Please check that the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-check on load if ?id= is present or if saved in localStorage
  useEffect(() => {
    if (idFromQuery) {
      const parsed = parseInt(idFromQuery, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setMerchantId(String(parsed));
        fetchStatus(parsed);
        return;
      }
    }

    // Check localStorage fallback
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nexdrop_merchant_application");
        if (saved) {
          const parsedSaved = JSON.parse(saved);
          if (parsedSaved?.merchant_id) {
            setMerchantId(String(parsedSaved.merchant_id));
            fetchStatus(parsedSaved.merchant_id);
          }
        }
      } catch {
        // ignore storage parse errors
      }
    }
  }, [idFromQuery, fetchStatus]);

  const handleManualCheck = () => {
    setIdError("");
    setServerError(null);
    setStatusData(null);

    const parsed = parseInt(merchantId.trim(), 10);
    if (!merchantId.trim() || isNaN(parsed) || parsed <= 0) {
      setIdError("Please enter a valid numeric Application ID.");
      return;
    }

    fetchStatus(parsed);
  };

  const config = statusData ? STATUS_CONFIG[statusData.approval_status] : null;

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Heading */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-full bg-[#064E3B]/10 flex items-center justify-center mb-2">
          <svg className="h-7 w-7 text-[#064E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">
          Application Review Status
        </h1>
        <p className="text-sm text-[#64748B]">
          Track the live administrative verification progress of your merchant registration.
        </p>
      </div>

      {/* Lookup Card */}
      <Card className="border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b border-[#E5E7EB] pb-4 bg-[#F8FAF8]">
          <CardTitle className="text-base text-[#064E3B]">Application Lookup</CardTitle>
          <CardDescription className="text-xs">
            Enter your numeric Application Reference ID (e.g. from{" "}
            <code className="font-mono bg-[#E2E8F0] px-1.5 py-0.5 rounded text-[11px] text-[#064E3B]">MER-000042</code> enter <code className="font-mono font-bold">42</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 pb-6 space-y-4">
          <div className="flex gap-2">
            <Input
              id="merchant-id"
              label="Application ID"
              placeholder="e.g. 1, 42"
              type="number"
              min={1}
              value={merchantId}
              onChange={(e) => {
                setMerchantId(e.target.value);
                setIdError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleManualCheck()}
              error={idError}
              className="flex-1"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleManualCheck}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking Status…
              </span>
            ) : (
              "Check Live Status"
            )}
          </Button>

          {serverError && (
            <Alert variant="error" hideIcon>{serverError}</Alert>
          )}
        </CardContent>
      </Card>

      {/* Status Result Card */}
      {statusData && config && (
        <Card className="border border-[#E5E7EB] shadow-md rounded-xl overflow-hidden bg-white">
          <CardHeader
            className={
              statusData.approval_status === "approved"
                ? "bg-emerald-50 border-b border-emerald-200"
                : statusData.approval_status === "rejected"
                ? "bg-rose-50 border-b border-rose-200"
                : "bg-amber-50 border-b border-amber-200"
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-0.5">
                  Reference: MER-{String(statusData.merchant_id).padStart(6, "0")}
                </p>
                <CardTitle className="text-lg font-bold text-[#1F2937]">
                  {statusData.business_name}
                </CardTitle>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xl">{config.icon}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 pb-6 space-y-5">
            <p className="text-sm text-[#4B5563] leading-relaxed">{config.description}</p>

            {/* Pending: Show Verification Progress Tracker */}
            {statusData.approval_status === "pending" && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#064E3B]">
                  Verification Milestones
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/50">
                    <span className="h-4 w-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-[#064E3B]">Application Submitted</p>
                      <p className="text-[#4B5563]">Business information and documents logged in queue.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">
                      ⏳
                    </span>
                    <div>
                      <p className="font-semibold text-amber-900">Admin Review (In Progress)</p>
                      <p className="text-amber-800/90">Our administrative staff is reviewing your application details. Standard review SLA is 1–2 business days.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#F8FAF8] border border-[#E5E7EB] opacity-60">
                    <span className="h-4 w-4 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-[#64748B]">Portal Access & API Credentials</p>
                      <p className="text-[#64748B]">Unlocked immediately once an administrator approves your profile.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => fetchStatus(statusData.merchant_id)}
                    disabled={isLoading}
                    type="button"
                  >
                    {isLoading ? "Refreshing…" : "Refresh Approval Status"}
                  </Button>
                </div>
              </div>
            )}

            {/* Approved: Direct CTA to Login */}
            {statusData.approval_status === "approved" && (
              <div className="pt-2 space-y-3">
                <Alert variant="success" hideIcon>
                  <p className="text-xs font-medium">
                    Your merchant account is active! You can now log in using your registered credentials.
                  </p>
                </Alert>
                <Link href="/login?redirect=/merchant/dashboard" className="block">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-md">
                    Sign In to Merchant Portal →
                  </Button>
                </Link>
              </div>
            )}

            {/* Rejected: Show Reason */}
            {statusData.approval_status === "rejected" && (
              <div className="space-y-3">
                {statusData.rejection_reason && (
                  <Alert variant="error" title="Reason for Rejection" hideIcon>
                    {statusData.rejection_reason}
                  </Alert>
                )}
                <Alert variant="info" hideIcon>
                  Need assistance or want to appeal? Contact{" "}
                  <a href="mailto:support@nexdrop.com" className="underline font-semibold text-[#064E3B]">
                    support@nexdrop.com
                  </a>{" "}
                  with your reference number <strong>MER-{String(statusData.merchant_id).padStart(6, "0")}</strong>.
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Links */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-sm text-[#64748B]">
          Haven&apos;t applied yet?{" "}
          <Link href="/merchant/register" className="font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors">
            Register your business →
          </Link>
        </p>
        <p className="text-sm text-[#64748B]">
          <Link href="/" className="text-xs text-[#64748B] hover:text-[#064E3B] transition-colors">
            ← Back to NexDrop home
          </Link>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with Suspense wrapper
// ---------------------------------------------------------------------------

export default function ApplicationStatusPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F1] flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white border-b border-[#E5E7EB] h-16 flex items-center px-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5" aria-label="NexDrop home">
          <div className="h-8 w-8 rounded-lg bg-[#064E3B] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#A3E635]" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-lg font-bold text-[#064E3B] tracking-tight">
            Nex<span className="text-[#16A34A]">Drop</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-[#064E3B] hover:text-[#16A34A] transition-colors">
            Sign In
          </Link>
          <Link href="/merchant/register">
            <Button variant="secondary" size="sm">
              Register
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="text-center p-8 text-sm text-[#64748B]">
              Loading application status…
            </div>
          }
        >
          <ApplicationStatusContent />
        </Suspense>
      </main>
    </div>
  );
}
