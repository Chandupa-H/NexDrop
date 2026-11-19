"use client";

import Link from "next/link";
import {
  PackageCheck,
  Store,
  ArrowRight,
  ShieldCheck,
  Zap,
  Truck,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";

export default function RegisterRoleSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F1] text-[#1F2937]">
      {/* Header with NexDrop Logo */}
      <header className="w-full border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group focus:outline-none">
            <NexDropLogo size="sm" />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#064E3B] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8">
          {/* Header Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-[#064E3B] text-xs font-bold border border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-[#16A34A]" />
              Account Registration
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] tracking-tight">
              How will you be using NexDrop?
            </h1>

            <p className="text-sm sm:text-base text-[#1F2937]/75 max-w-xl mx-auto leading-relaxed">
              Choose your registration type to proceed with setting up your account. Whether you are sending personal parcels or scaling an e-commerce brand, we have tailored tools for you.
            </p>
          </div>

          {/* Registration Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
            {/* Card 1: Register as Customer */}
            <Card className="relative flex flex-col justify-between border-2 border-emerald-200 hover:border-[#16A34A] transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl bg-white overflow-hidden group">
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#064E3B] group-hover:scale-105 transition-transform">
                    <PackageCheck className="h-7 w-7 text-[#16A34A]" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold text-[#064E3B] border-emerald-200 bg-emerald-50"
                  >
                    Personal &amp; Recipient
                  </Badge>
                </div>

                <div>
                  <CardTitle className="text-2xl font-bold text-[#064E3B]">
                    Register as a Customer
                  </CardTitle>
                  <CardDescription className="text-sm text-[#1F2937]/80 mt-2 leading-relaxed">
                    For individuals sending personal packages, scheduling doorstep pickups, or tracking incoming deliveries in real time.
                  </CardDescription>
                </div>

                <ul className="space-y-3 pt-3 text-xs font-medium text-[#1F2937]/85 border-t border-emerald-100/80">
                  <li className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <span>Live GPS parcel tracking &amp; dynamic ETA</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <span>Delivery Passcode (OTP) security</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <span>Instant weight &amp; distance pricing calculator</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 pt-0 sm:p-8 sm:pt-0">
                <Link href="/customer/register" className="w-full block">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-bold shadow-sm justify-center group-hover:bg-[#043327]"
                  >
                    Register as a Customer
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Card 2: Register as Merchant */}
            <Card className="relative flex flex-col justify-between border-2 border-emerald-200 hover:border-[#064E3B] transition-all duration-200 shadow-sm hover:shadow-md rounded-2xl bg-white overflow-hidden group">
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-100 text-[#064E3B] group-hover:scale-105 transition-transform">
                    <Store className="h-7 w-7 text-[#064E3B]" />
                  </div>
                  <Badge variant="lime" className="text-xs font-semibold">
                    Business &amp; E-Commerce
                  </Badge>
                </div>

                <div>
                  <CardTitle className="text-2xl font-bold text-[#064E3B]">
                    Register as a Merchant
                  </CardTitle>
                  <CardDescription className="text-sm text-[#1F2937]/80 mt-2 leading-relaxed">
                    For online stores and business brands requiring high-volume parcel dispatch, warehouse pickups, and COD settlements.
                  </CardDescription>
                </div>

                <ul className="space-y-3 pt-3 text-xs font-medium text-[#1F2937]/85 border-t border-emerald-100/80">
                  <li className="flex items-center gap-2.5">
                    <PackageCheck className="h-4 w-4 text-[#064E3B] shrink-0" />
                    <span>Bulk order creation &amp; shipping label printing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-[#064E3B] shrink-0" />
                    <span>Store API Keys &amp; real-time Webhook events</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#064E3B] shrink-0" />
                    <span>Automated Cash on Delivery (COD) payouts</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 pt-0 sm:p-8 sm:pt-0">
                <Link href="/merchant/register" className="w-full block">
                  <Button
                    variant="lime"
                    size="lg"
                    className="w-full font-bold shadow-sm justify-center group-hover:brightness-95"
                  >
                    Register as a Merchant
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Footer Assistance Note */}
          <div className="text-center pt-4">
            <p className="text-xs text-[#64748B]">
              Already have an approved operational account?{" "}
              <Link href="/login" className="font-semibold text-[#064E3B] hover:underline">
                Sign in directly
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

