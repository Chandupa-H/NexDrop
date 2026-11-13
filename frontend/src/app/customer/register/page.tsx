"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  RefreshCw,
  AlertCircle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";
import { supabase } from "@/lib/supabase/client";

const CUSTOMER_ROLE_ID = "51e60818-d8c1-46e0-afc6-93d2da35ea4c";

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Colombo");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setEmail(data.user.email || "");
        const existingName =
          (data.user.user_metadata?.full_name as string) ||
          (data.user.user_metadata?.name as string) ||
          (data.user.email ? data.user.email.split("@")[0].replace(".", " ").replace(/_/g, " ") : "");
        setFullName(existingName);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !streetAddress.trim()) {
      setError("Please fill in all required fields (Name, Phone number, and Delivery address).");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // If unauthenticated, redirect to login with returnTo
        router.push(`/login?returnTo=${encodeURIComponent("/customer/register")}`);
        return;
      }

      // 1. Update Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: {
          role: "customer",
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      });

      // 2. Upsert profile in Supabase profiles table
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          role_id: CUSTOMER_ROLE_ID,
          full_name: fullName.trim(),
          email: user.email,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F1] px-4">
        <Card className="max-w-md w-full p-8 text-center rounded-2xl border-2 border-emerald-300 bg-white shadow-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#064E3B]">
            <CheckCircle2 className="h-9 w-9 text-[#16A34A]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#064E3B]">Registration Complete!</h2>
          <p className="text-sm text-[#1F2937]/75">
            Your customer account has been configured. Redirecting you to your NexDrop shipping portal...
          </p>
          <div className="pt-2">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-[#16A34A]" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F1] text-[#1F2937]">
      {/* Header */}
      <header className="w-full border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group focus:outline-none">
            <NexDropLogo size="sm" />
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#064E3B] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change Account Type
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <Card className="rounded-2xl border border-emerald-200/90 bg-white shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100/80 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#064E3B] text-white">
                  <PackageCheck className="h-6 w-6 text-[#A3E635]" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-[#064E3B] border-emerald-300 bg-emerald-50 mb-1">
                    Customer Profile
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-[#064E3B]">
                    Complete Customer Registration
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm text-[#1F2937]/75 mt-2">
                Provide your contact and primary delivery location so couriers can accurately deliver packages to your doorstep.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Kasun Jayawardena"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Email and Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g. +94 77 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-[#64748B]">
                      Used for delivery OTP security &amp; live SMS arrival alerts.
                    </p>
                  </div>
                </div>

                {/* Delivery Street Address */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Primary Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="House/Apartment No., Street name"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                  />
                </div>

                {/* City & Postal Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider">
                      City / District
                    </label>
                    <Input
                      placeholder="e.g. Colombo, Kandy, Galle"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider">
                      Postal Code (Optional)
                    </label>
                    <Input
                      placeholder="e.g. 00300"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Special Delivery Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#064E3B] uppercase tracking-wider">
                    Delivery Instructions / Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Leave with apartment security, call 10 mins before arrival"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isLoading}
                    className="w-full font-bold shadow-sm justify-center"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Setting Up Customer Account...
                      </>
                    ) : (
                      <>
                        Complete Registration &amp; Start Shipping
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Alternative Link */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-[#64748B]">
                  Looking to sell and ship in bulk?{" "}
                  <Link href="/merchant/register" className="font-semibold text-[#064E3B] hover:underline inline-flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Register as a Merchant instead
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

