"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { useBackendHealth } from "@/hooks/use-health";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SavedApplication {
  merchant_id: number;
  business_name?: string;
  email?: string;
  approval_status?: string;
}

export default function MerchantPage() {
  const { isHealthy } = useBackendHealth();
  const [savedApp, setSavedApp] = useState<SavedApplication | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const item = localStorage.getItem("nexdrop_merchant_application");
        if (item) {
          setSavedApp(JSON.parse(item));
        }
      } catch {
        // ignore storage parse errors
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F1F5F1] flex flex-col">
      {/* Home Navbar */}
      <Navbar backendHealthy={isHealthy} />

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-[#064E3B] tracking-tight">
              NexDrop Merchant Portal
            </h1>
            <p className="text-sm text-[#64748B] max-w-md mx-auto">
              Shipment creation, automated courier dispatching, and high-volume delivery management.
            </p>
          </div>

          {/* Pending Review Notice if applicant has submitted */}
          {savedApp && (
            <Card className="border border-amber-200 bg-amber-50/70 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">
                    ⏳
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#1F2937] text-sm">
                        {savedApp.business_name || "Your Application"}
                      </p>
                      <Badge variant="secondary">Under Review</Badge>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Reference: <strong className="font-mono text-[#064E3B]">MER-{String(savedApp.merchant_id).padStart(6, "0")}</strong>
                    </p>
                  </div>
                </div>

                <Link href={`/merchant/application-status?id=${savedApp.merchant_id}`}>
                  <Button variant="secondary" size="sm" className="whitespace-nowrap">
                    View Review Status →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Action Gateway Card */}
          <Card className="border border-[#E5E7EB] bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-[#F8FAF8] border-b border-[#E5E7EB] pb-4">
              <CardTitle className="text-base text-[#064E3B]">Merchant Gateway</CardTitle>
              <CardDescription className="text-xs">
                Select an option below to access your account or register a new business.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {savedApp?.approval_status === "approved" ? (
                <Link href="/merchant/dashboard" className="block">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-sm">
                    Open Merchant Dashboard →
                  </Button>
                </Link>
              ) : savedApp?.merchant_id ? (
                <Link href={`/merchant/application-status?id=${savedApp.merchant_id}`} className="block">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-sm">
                    Open Merchant Dashboard →
                  </Button>
                </Link>
              ) : (
                <Link href="/merchant/register" className="block">
                  <Button variant="primary" size="lg" className="w-full font-bold shadow-sm">
                    Open Merchant Dashboard →
                  </Button>
                </Link>
              )}

              {!savedApp && (
                <div className="pt-2">
                  <Link href="/merchant/register" className="block">
                    <Button variant="secondary" size="md" className="w-full">
                      Register Business
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[#64748B]">
            Need help? Contact <a href="mailto:support@nexdrop.com" className="text-[#064E3B] underline font-medium">support@nexdrop.com</a>
          </p>
        </div>
      </main>

      {/* Footer matching Home */}
      <Footer />
    </div>
  );
}
