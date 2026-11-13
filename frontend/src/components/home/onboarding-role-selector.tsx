"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  PackageCheck,
  Store,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Truck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

interface OnboardingRoleSelectorProps {
  user: User;
  onRoleAssigned?: (newRole: "customer" | "merchant") => void;
}

const CUSTOMER_ROLE_ID = "51e60818-d8c1-46e0-afc6-93d2da35ea4c";
const MERCHANT_ROLE_ID = "77c88643-45ad-4aff-8128-f5c0e4dab972";

export function OnboardingRoleSelector({
  user,
  onRoleAssigned,
}: OnboardingRoleSelectorProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"customer" | "merchant" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRole, setCompletedRole] = useState<"customer" | "merchant" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegisterRole = async (targetRole: "customer" | "merchant") => {
    setSelectedRole(targetRole);
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Update user metadata in Supabase Auth
      await supabase.auth.updateUser({
        data: {
          role: targetRole,
        },
      });

      // 2. Upsert profile record with the corresponding role_id
      const roleId = targetRole === "customer" ? CUSTOMER_ROLE_ID : MERCHANT_ROLE_ID;
      const fullName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        (user.email ? user.email.split("@")[0].replace(".", " ").replace(/_/g, " ") : targetRole);

      await supabase.from("profiles").upsert(
        {
          id: user.id,
          role_id: roleId,
          full_name: fullName,
          email: user.email,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      setCompletedRole(targetRole);
      onRoleAssigned?.(targetRole);

      if (targetRole === "merchant") {
        router.push("/merchant");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign account role.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedRole === "customer") {
    return (
      <Card className="border-2 border-[#16A34A] bg-emerald-50/70 p-6 sm:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#064E3B] text-white">
              <CheckCircle2 className="h-6 w-6 text-[#A3E635]" />
            </div>
            <div>
              <Badge variant="lime" className="mb-1 text-xs">Registration Completed</Badge>
              <h3 className="text-xl font-bold text-[#064E3B]">
                Welcome, NexDrop Customer!
              </h3>
              <p className="text-sm text-[#1F2937]/80 mt-1 max-w-xl">
                Your account is now active. You can track real-time parcel deliveries, calculate shipping quotes, and manage recipient preferences right from this home page.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const el = document.getElementById("calculator");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="font-bold shrink-0"
          >
            Calculate Shipping Rate
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-[#064E3B] text-xs font-bold mb-3 border border-emerald-200">
          <Sparkles className="h-3.5 w-3.5 text-[#16A34A]" />
          Account Setup Required
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] tracking-tight">
          How will you be using NexDrop?
        </h2>
        <p className="text-sm sm:text-base text-[#1F2937]/70 mt-1 max-w-2xl">
          Choose your account type to configure your workspace. Whether you are sending personal packages or scaling an e-commerce business, we have got you covered.
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Option 1: Customer Account */}
        <Card className="relative flex flex-col justify-between border-2 border-emerald-200 hover:border-[#16A34A] transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl bg-white overflow-hidden group">
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-[#064E3B] group-hover:scale-105 transition-transform">
                <PackageCheck className="h-6 w-6 text-[#16A34A]" />
              </div>
              <Badge variant="outline" className="text-xs font-semibold text-[#064E3B] border-emerald-200 bg-emerald-50">
                Personal &amp; Recipient
              </Badge>
            </div>

            <div>
              <CardTitle className="text-xl font-bold text-[#064E3B]">
                Register as a Customer
              </CardTitle>
              <CardDescription className="text-sm text-[#1F2937]/80 mt-1.5 leading-relaxed">
                For individuals sending personal packages, ordering deliveries, or tracking incoming parcels in real time.
              </CardDescription>
            </div>

            <ul className="space-y-2.5 pt-2 text-xs font-medium text-[#1F2937]/85 border-t border-emerald-100/70">
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#16A34A]" />
                <span>Live GPS parcel tracking &amp; dynamic ETA</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                <span>Delivery Passcode (OTP) verification</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#16A34A]" />
                <span>Instant weight &amp; distance pricing estimates</span>
              </li>
            </ul>
          </div>

          <div className="p-6 pt-0 sm:p-7 sm:pt-0">
            <Button
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              onClick={() => handleRegisterRole("customer")}
              className="w-full font-bold shadow-sm justify-center"
            >
              {isSubmitting && selectedRole === "customer" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Setting Up...
                </>
              ) : (
                <>
                  Register as Customer
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Option 2: Merchant Account */}
        <Card className="relative flex flex-col justify-between border-2 border-emerald-200 hover:border-[#064E3B] transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl bg-white overflow-hidden group">
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-100 text-[#064E3B] group-hover:scale-105 transition-transform">
                <Store className="h-6 w-6 text-[#064E3B]" />
              </div>
              <Badge variant="lime" className="text-xs font-semibold">
                Business &amp; E-Commerce
              </Badge>
            </div>

            <div>
              <CardTitle className="text-xl font-bold text-[#064E3B]">
                Register as a Merchant
              </CardTitle>
              <CardDescription className="text-sm text-[#1F2937]/80 mt-1.5 leading-relaxed">
                For online shops and commercial businesses shipping multiple orders with automated logistics &amp; COD settlements.
              </CardDescription>
            </div>

            <ul className="space-y-2.5 pt-2 text-xs font-medium text-[#1F2937]/85 border-t border-emerald-100/70">
              <li className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-[#064E3B]" />
                <span>Bulk order creation &amp; shipping label printing</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#064E3B]" />
                <span>API Keys &amp; Webhook events for your online store</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#064E3B]" />
                <span>Automated Cash on Delivery (COD) payouts</span>
              </li>
            </ul>
          </div>

          <div className="p-6 pt-0 sm:p-7 sm:pt-0">
            <Button
              variant="lime"
              size="lg"
              disabled={isSubmitting}
              onClick={() => handleRegisterRole("merchant")}
              className="w-full font-bold shadow-sm justify-center"
            >
              {isSubmitting && selectedRole === "merchant" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Opening Portal...
                </>
              ) : (
                <>
                  Register as Merchant
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

