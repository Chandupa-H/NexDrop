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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export function OnboardingRoleSelector() {
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
            <Link href="/customer/register" className="w-full block">
              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-sm justify-center group-hover:bg-[#043327]"
              >
                Register as Customer
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
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
            <Link href="/merchant/register" className="w-full block">
              <Button
                variant="lime"
                size="lg"
                className="w-full font-bold shadow-sm justify-center group-hover:brightness-95"
              >
                Register as Merchant
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
