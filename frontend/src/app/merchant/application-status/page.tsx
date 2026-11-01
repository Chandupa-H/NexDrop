"use client";

import { useState } from "react";
import Link from "next/link";
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
      "Your application has been received and is currently being reviewed by our team. This usually takes 1–2 business days.",
    icon: "⏳",
  },
  approved: {
    label: "Approved",
    variant: "success",
    description:
      "Congratulations! Your merchant account has been approved. You can now sign in to your portal.",
    icon: "✓",
  },
  rejected: {
    label: "Not Approved",
    variant: "destructive",
    description:
      "Unfortunately your application was not approved at this time. Please review the reason below and contact support if needed.",
    icon: "✕",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApplicationStatusPage() {
  const [merchantId, setMerchantId] = useState("");
  const [idError, setIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<MerchantStatusResponse | null>(null);

  const handleCheck = async () => {
    setIdError("");
    setServerError(null);
    setStatusData(null);

    const parsed = parseInt(merchantId.trim(), 10);
    if (!merchantId.trim() || isNaN(parsed) || parsed <= 0) {
      setIdError("Please enter a valid numeric Application ID.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient.getMerchantStatus(parsed);
      setStatusData(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setServerError(`No application found with ID ${parsed}. Please double-check your reference number.`);
      } else if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const config = statusData ? STATUS_CONFIG[statusData.approval_status] : null;

  return (
    <div className="min-h-screen bg-[#F1F5F1] flex flex-col">
      {/* Minimal header */}
      <header className="bg-white border-b border-[#E5E7EB] h-16 flex items-center px-6">
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
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Heading */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#064E3B]/10 flex items-center justify-center mb-2">
              <svg className="h-7 w-7 text-[#064E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">
              Check Application Status
            </h1>
            <p className="text-sm text-[#64748B]">
              Enter your Application Reference ID to see the current status of your merchant registration.
            </p>
          </div>

          {/* Lookup card */}
          <Card className="border border-[#E5E7EB] shadow-sm rounded-xl">
            <CardHeader className="border-b border-[#E5E7EB] pb-4">
              <CardTitle className="text-base text-[#064E3B]">Application Lookup</CardTitle>
              <CardDescription className="text-xs">
                Your reference number was shown after you submitted your application (e.g.{" "}
                <code className="font-mono bg-[#F1F5F1] px-1 py-0.5 rounded text-[11px]">MER-000001</code>).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-6 space-y-4">
              <div className="flex gap-3">
                <Input
                  id="merchant-id"
                  label="Application ID"
                  placeholder="Enter numeric ID (e.g. 1, 42)"
                  type="number"
                  min={1}
                  value={merchantId}
                  onChange={(e) => {
                    setMerchantId(e.target.value);
                    setIdError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                  error={idError}
                  className="flex-1"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleCheck}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking…
                  </span>
                ) : (
                  "Check Status"
                )}
              </Button>

              {serverError && (
                <Alert variant="error">{serverError}</Alert>
              )}
            </CardContent>
          </Card>

          {/* Status result */}
          {statusData && config && (
            <Card className="border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
              <CardHeader
                className={
                  statusData.approval_status === "approved"
                    ? "bg-green-50 border-b border-green-200"
                    : statusData.approval_status === "rejected"
                    ? "bg-red-50 border-b border-red-200"
                    : "bg-amber-50 border-b border-amber-200"
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-1">
                      Application MER-{String(statusData.merchant_id).padStart(6, "0")}
                    </p>
                    <CardTitle className="text-base text-[#1F2937]">
                      {statusData.business_name}
                    </CardTitle>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-2xl">{config.icon}</span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-5 space-y-4">
                <p className="text-sm text-[#64748B]">{config.description}</p>

                {statusData.approval_status === "rejected" && statusData.rejection_reason && (
                  <Alert variant="error" title="Reason for rejection">
                    {statusData.rejection_reason}
                  </Alert>
                )}

                {statusData.approval_status === "approved" && (
                  <Link href="/merchant/login">
                    <Button variant="primary" size="md" className="w-full mt-1">
                      Sign In to Merchant Portal →
                    </Button>
                  </Link>
                )}

                {statusData.approval_status === "rejected" && (
                  <Alert variant="info">
                    Need help? Contact{" "}
                    <a href="mailto:support@nexdrop.com" className="underline font-medium">
                      support@nexdrop.com
                    </a>{" "}
                    with your application reference.
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Links */}
          <div className="text-center space-y-2">
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
      </main>
    </div>
  );
}
