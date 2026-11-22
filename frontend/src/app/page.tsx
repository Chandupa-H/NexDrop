"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Zap,
  Calculator,
  RefreshCw,
  Code,
  Users,
  Compass,
  Bell,
  Webhook,
  LogIn,
  Store,
  LayoutDashboard,
  Check,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Camera,
  Radio,
  FileCheck2,
  QrCode,
  ArrowUpRight,
} from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OnboardingRoleSelector } from "@/components/home/onboarding-role-selector";
import { useBackendHealth } from "@/hooks/use-health";
import { useAuthUser } from "@/hooks/use-auth-user";
import apiClient, { PriceEstimateResponse } from "@/lib/api-client";

export default function Home() {
  const { health, isHealthy } = useBackendHealth();
  const { user, role, dashboardHref, isLoading: authLoading } = useAuthUser();
  const forceOnboarding = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("onboarding") === "select-role",
    () => false
  );

  // Interactive Pricing Calculator State
  const [distanceKm, setDistanceKm] = useState<number>(14);
  const [weightKg, setWeightKg] = useState<number>(2.5);
  const [selectedTier, setSelectedTier] = useState<string>("Standard");
  const [calcResult, setCalcResult] = useState<PriceEstimateResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Active Role Showcase Tab
  const [activeRoleTab, setActiveRoleTab] = useState<"customer" | "merchant" | "courier" | "dispatcher">("merchant");

  // Architecture section collapsible state
  const [techSectionOpen, setTechSectionOpen] = useState(false);

  const packagePresets = [
    { label: "Document / Envelope", weight: 0.5, dist: 6 },
    { label: "E-Commerce Box", weight: 2.5, dist: 14 },
    { label: "Apparel Pack", weight: 5.0, dist: 22 },
    { label: "Bulk Carton", weight: 15.0, dist: 45 },
  ];

  const handleCalculatePrice = async () => {
    setCalcLoading(true);
    try {
      const result = await apiClient.getPricingEstimate({
        tier_name: selectedTier,
        distance_km: Number(distanceKm),
        weight_kg: Number(weightKg),
      });
      setCalcResult(result);
    } catch {
      // Fallback calculation in Rs.
      const base = selectedTier === "Express" ? 500 : selectedTier === "SameDay" ? 650 : 350;
      const distCost = Number(distanceKm) * 45;
      const weightCost = Number(weightKg) * 80;
      setCalcResult({
        tier_name: selectedTier,
        distance_km: Number(distanceKm),
        weight_kg: Number(weightKg),
        base_rate: base,
        distance_cost: distCost,
        weight_cost: weightCost,
        total_price: Math.round(base + distCost + weightCost),
      });
    } finally {
      setCalcLoading(false);
    }
  };

  const deliveryZones = [
    { code: "LK-COL-A", name: "Colombo Central & Fort Hub", activeCouriers: 32, avgMins: 25, status: "High Demand" },
    { code: "LK-COL-B", name: "South Urban (Bambalapitiya & Havelock)", activeCouriers: 24, avgMins: 30, status: "Active" },
    { code: "LK-COL-C", name: "Coastal Corridor (Dehiwala & Mount)", activeCouriers: 18, avgMins: 35, status: "Active" },
    { code: "LK-COL-D", name: "Tech & East Corridor (Malabe & Rajagiriya)", activeCouriers: 14, avgMins: 40, status: "Active" },
    { code: "LK-COL-E", name: "Northern Perimeter (Wattala & Kelaniya)", activeCouriers: 9, avgMins: 45, status: "Standard" },
  ];

  const modules = [
    { title: "Authentication & RBAC", desc: "Argon2 password hashing, JWT sessions & Supabase auth syncing.", icon: ShieldCheck, path: "app/modules/auth" },
    { title: "Customer & Address Book", desc: "Sender profiles, saved addresses, and recipient directory.", icon: Users, path: "app/modules/customers" },
    { title: "Merchant Operations", desc: "Batch CSV manifests, automated API keys & telemetry.", icon: Layers, path: "app/modules/merchants" },
    { title: "Courier Fleet Management", desc: "GPS coordinates, vehicle telemetry, and shift availability.", icon: Truck, path: "app/modules/couriers" },
    { title: "Parcel Lifecycle & Proof", desc: "Barcode tracking, transition states & Cloudinary image POD.", icon: Package, path: "app/modules/parcels" },
    { title: "Smart Dispatch Engine", desc: "Automated parcel-to-courier matching by proximity and capacity.", icon: Compass, path: "app/modules/dispatch" },
    { title: "Dynamic Pricing Engine", desc: "Distance, weight, and urban surge calculations with multi-tiers.", icon: Calculator, path: "app/modules/pricing" },
    { title: "Notification Service", desc: "Real-time recipient SMS, email, and milestone push alerts.", icon: Bell, path: "app/modules/notifications" },
    { title: "Merchant Webhooks", desc: "HMAC-SHA256 signature verification & delivery callbacks.", icon: Webhook, path: "app/modules/webhooks" },
    { title: "Real-time Integrations", desc: "RabbitMQ message brokering & WebSocket telemetry.", icon: Zap, path: "app/integrations" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-[#1F2937]">
      <Navbar backendHealthy={isHealthy} />

      {/* Onboarding Section for New Users without an Assigned Operational Role */}
      {((!authLoading && user && !role) || forceOnboarding) && (
        <section className="bg-gradient-to-b from-emerald-50/90 to-white border-b border-emerald-200/80 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <OnboardingRoleSelector />
          </div>
        </section>
      )}

      {/* ── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-20 md:pb-24 border-b border-[#E5E7EB] bg-white">
        {/* Subtle geometric dot grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#16A34A_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#064E3B]">
                <Radio className="h-3.5 w-3.5 text-[#16A34A] animate-pulse" />
                <span>Next-Gen Smart Logistics Across Sri Lanka</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#064E3B] leading-[1.12]">
                Smart parcel drops. <br />
                <span className="text-[#16A34A]">
                  Clocked to the minute.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#1F2937]/80 leading-relaxed max-w-2xl">
                From on-demand doorstep pickups to automated e-commerce fulfillment, NexDrop coordinates senders, couriers, and merchants through intelligent algorithmic dispatch across Western Province and island-wide hubs.
              </p>

              {/* Key Value Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB]">
                  <Clock className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span className="text-xs font-semibold text-[#064E3B]">Same-Day Urban Drop</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB]">
                  <Camera className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span className="text-xs font-semibold text-[#064E3B]">Digital Photo POD</span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB]">
                  <FileCheck2 className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span className="text-xs font-semibold text-[#064E3B]">COD Settlement</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                {!authLoading && user ? (
                  role && role !== "unassigned" ? (
                    <Link href={dashboardHref}>
                      <Button variant="primary" size="lg" className="shadow-md font-bold sm:px-6">
                        <LayoutDashboard className="h-4 w-4" />
                        Open Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/register">
                      <Button variant="primary" size="lg" className="shadow-md font-bold sm:px-6">
                        <Sparkles className="h-4 w-4" />
                        Configure Account
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="primary" size="lg" className="shadow-md font-bold sm:px-6">
                        <Package className="h-4 w-4" />
                        Ship a Parcel
                      </Button>
                    </Link>

                    <Link href="/merchant/register">
                      <Button variant="lime" size="lg" className="shadow-md font-bold text-[#064E3B] sm:px-6">
                        <Store className="h-4 w-4" />
                        Merchant Account
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="lg"
                      className="font-semibold"
                      onClick={() => {
                        const el = document.getElementById("calculator");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Calculator className="h-4 w-4 text-[#16A34A]" />
                      Rate Estimator
                    </Button>

                    <Link href="/login">
                      <Button variant="ghost" size="lg" className="font-semibold">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Trust Metric Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E5E7EB]">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#064E3B]">35 min</div>
                  <div className="text-xs text-[#64748B]">Avg Urban Delivery</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#064E3B]">100%</div>
                  <div className="text-xs text-[#64748B]">Verified Photo &amp; Geo POD</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#064E3B]">99.4%</div>
                  <div className="text-xs text-[#64748B]">On-Time Fulfillment</div>
                </div>
              </div>
            </div>

            {/* Right Visual Graphic: Platform Architecture & Dispatch Radar Card */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Glow backdrop */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 to-lime-400/20 rounded-3xl blur-xl" />

                <Card className="relative border-2 border-emerald-600/30 shadow-2xl bg-white overflow-hidden rounded-2xl">
                  {/* Card Header Bar */}
                  <div className="bg-[#064E3B] px-5 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3E635] opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#A3E635]" />
                      </span>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">NexDrop Smart Grid</div>
                        <div className="text-sm font-bold text-white">Live Logistics Engine</div>
                      </div>
                    </div>
                    <Badge variant="lime" className="text-xs font-bold font-mono">
                      Active Telemetry
                    </Badge>
                  </div>

                  {/* Capabilities Showcase */}
                  <div className="p-5 space-y-4">
                    {/* Feature Row 1: Proximity Dispatch */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        <Compass className="h-5 w-5 text-[#16A34A]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-[#064E3B]">Proximity-Based Auto Dispatch</div>
                        <p className="text-[#64748B] leading-relaxed">
                          Packages are automatically paired with the closest available courier based on vehicle capacity, traffic conditions, and drop zone.
                        </p>
                      </div>
                    </div>

                    {/* Feature Row 2: Photo POD Handover */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        <Camera className="h-5 w-5 text-[#16A34A]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-[#064E3B]">Cryptographic &amp; Photo POD</div>
                        <p className="text-[#64748B] leading-relaxed">
                          Deliveries conclude with an in-app recipient signature or timestamped photo uploaded to cloud storage before status transition.
                        </p>
                      </div>
                    </div>

                    {/* Feature Row 3: Merchant Webhooks */}
                    <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        <Webhook className="h-5 w-5 text-[#16A34A]" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-[#064E3B]">HMAC-Signed E-Commerce Webhooks</div>
                        <p className="text-[#64748B] leading-relaxed">
                          Instant webhook notifications for Shopify, WooCommerce, or custom ERP systems whenever parcels are sorted, in transit, or delivered.
                        </p>
                      </div>
                    </div>

                    {/* Pipeline Visualizer (No personal user data) */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold text-[#064E3B]">
                        <span>Standard Chain of Custody</span>
                        <span className="text-[#16A34A]">End-to-End Verified</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                        <span className="bg-white px-2 py-1 rounded border border-emerald-200 font-semibold text-[#064E3B]">1. Book Order</span>
                        <span>➔</span>
                        <span className="bg-white px-2 py-1 rounded border border-emerald-200 font-semibold text-[#064E3B]">2. Hub Sort</span>
                        <span>➔</span>
                        <span className="bg-white px-2 py-1 rounded border border-emerald-200 font-semibold text-[#064E3B]">3. Courier Transit</span>
                        <span>➔</span>
                        <span className="bg-[#064E3B] text-[#A3E635] px-2 py-1 rounded font-bold">4. Photo POD</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOUR SQUADS & SPECIALIZED WORKSPACES ────────────────────── */}
      <section id="services" className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="lime">Built For Everyone In The Chain</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] tracking-tight">
            Tailored Experiences for Every Role
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] max-w-2xl mx-auto">
            From private senders to enterprise e-commerce sellers, couriers on motorcycles to dispatch operators.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: "customer", label: "Senders & Customers", icon: Users },
            { id: "merchant", label: "E-Commerce Merchants", icon: Store },
            { id: "courier", label: "Courier Drivers", icon: Truck },
            { id: "dispatcher", label: "Fleet Dispatchers", icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRoleTab(tab.id as typeof activeRoleTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-[#064E3B] text-white shadow-md ring-2 ring-[#064E3B]/20"
                    : "bg-white text-[#1F2937]/80 hover:bg-[#F1F5F1] border border-[#E5E7EB]"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#A3E635]" : "text-[#16A34A]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Showcase Content */}
        <Card className="border-2 border-[#E5E7EB] bg-white shadow-xl overflow-hidden rounded-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 items-center">
            
            {activeRoleTab === "customer" && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <Badge variant="success">Customer Portal</Badge>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B]">
                    Send Parcels in Minutes. Track in Real Time.
                  </h3>
                  <p className="text-sm text-[#1F2937]/80 leading-relaxed">
                    Book doorstep pickups, specify delivery notes, and view milestone tracking updates once authenticated in your personal dashboard.
                  </p>
                  <ul className="space-y-2 text-sm text-[#1F2937]/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Saved address book with one-click recipient auto-fill
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Live courier location updates with realistic ETAs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Digital photo proof accessible right from your order log
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href={user ? dashboardHref : "/login?view=sign_up"}>
                      <Button variant="primary" size="lg" className="font-bold">
                        {user ? "Open Customer Dashboard" : "Create Customer Account"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-6 p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Doorstep Pickup</span>
                    <Badge variant="lime">Same-Day Available</Badge>
                  </div>
                  <div className="text-lg font-bold text-[#064E3B]">Colombo 03 ➔ Rajagiriya</div>
                  <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] text-xs space-y-1">
                    <div className="font-semibold text-[#1F2937]">Standard Delivery Package</div>
                    <div className="text-[#64748B]">Document &amp; Sample Box • 1.2 kg</div>
                    <div className="text-emerald-700 font-bold mt-1">Starting Rate: Rs. 420.00</div>
                  </div>
                </div>
              </>
            )}

            {activeRoleTab === "merchant" && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <Badge variant="lime">E-Commerce Merchant Workspace</Badge>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B]">
                    Scale E-Commerce Shipping with Zero Overhead
                  </h3>
                  <p className="text-sm text-[#1F2937]/80 leading-relaxed">
                    Designed for businesses shipping 10 to 500+ orders daily. Generate shipping labels in bulk, manage Cash on Delivery (COD), and automate status syncs via webhooks.
                  </p>
                  <ul className="space-y-2 text-sm text-[#1F2937]/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Live API Keys (Test &amp; Production) for custom website integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      HMAC-SHA256 signed webhook callbacks on all milestone events
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Direct merchant approval dashboard with automatic API credentials
                    </li>
                  </ul>
                  <div className="pt-2 flex items-center gap-3">
                    <Link href="/merchant/register">
                      <Button variant="primary" size="lg" className="font-bold">
                        Apply as Merchant
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/merchant">
                      <Button variant="outline" size="lg">
                        Merchant Portal
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-6 p-6 rounded-2xl bg-[#064E3B] text-white space-y-4">
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span>Merchant API Telemetry</span>
                    <Badge variant="lime">HTTP 200 OK</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-white/10 font-mono text-xs text-emerald-100 overflow-x-auto">
                    <code>{`POST /api/v1/merchants/orders
X-NexDrop-Key: nd_live_948f...
{
  "delivery_city": "Malabe",
  "cod_amount": 3450.00,
  "weight_kg": 2.5
}`}</code>
                  </div>
                  <div className="flex justify-between items-center text-xs text-emerald-200 pt-1">
                    <span>Automated Webhook Callback:</span>
                    <span className="font-bold text-[#A3E635]">order.in_transit (HMAC Valid)</span>
                  </div>
                </div>
              </>
            )}

            {activeRoleTab === "courier" && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <Badge variant="success">Courier Driver Fleet</Badge>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B]">
                    Optimized Multi-Stop Drops &amp; Instant POD
                  </h3>
                  <p className="text-sm text-[#1F2937]/80 leading-relaxed">
                    Designed for swift mobile interaction on the road. View assigned deliveries, access turn-by-turn routing via OpenStreetMap/OSRM, and complete drops in seconds with photo evidence.
                  </p>
                  <ul className="space-y-2 text-sm text-[#1F2937]/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Live GPS telemetry tracking paired with vehicle capacity
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Fast photo proof upload directly to cloud with retry resiliency
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Full delivery history logs with daily performance statistics
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/courier/dashboard">
                      <Button variant="primary" size="lg" className="font-bold">
                        Courier Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-6 p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>Today's Shift</span>
                    <span className="font-bold text-[#16A34A]">14 Delivered / 2 Remaining</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#064E3B]">Zone B Urban Route</div>
                      <div className="text-[11px] text-[#64748B]">Turn-by-turn road navigation via OSRM</div>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-800">
                      Camera Ready
                    </Badge>
                  </div>
                </div>
              </>
            )}

            {activeRoleTab === "dispatcher" && (
              <>
                <div className="lg:col-span-6 space-y-4">
                  <Badge variant="lime">Dispatcher Control Radar</Badge>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B]">
                    Centralized Fleet Balancing &amp; Hub Routing
                  </h3>
                  <p className="text-sm text-[#1F2937]/80 leading-relaxed">
                    Monitor all incoming unassigned parcels, auto-pair with the nearest available drivers, and manage warehouse cross-dock transfers across Colombo and suburbs.
                  </p>
                  <ul className="space-y-2 text-sm text-[#1F2937]/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Automated algorithm pairs packages by parcel weight &amp; courier vehicle
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Surge multiplier adjustments across high-volume delivery zones
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      Real-time RabbitMQ event stream updates without manual refresh
                    </li>
                  </ul>
                  <div className="pt-2">
                    <Link href="/dispatcher/dashboard">
                      <Button variant="primary" size="lg" className="font-bold">
                        Dispatcher Console
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-6 p-6 rounded-2xl bg-[#064E3B] text-white space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span>Hub Dispatch Queue</span>
                    <Badge variant="lime">Active Stream</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white/10 text-xs flex justify-between items-center">
                      <span>Zone D (Malabe Hub)</span>
                      <span className="text-[#A3E635] font-bold">Auto-Matched ➔ Nearest Courier</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/10 text-xs flex justify-between items-center">
                      <span>Zone A (Fort Central Hub)</span>
                      <span className="text-emerald-200">Cross-Dock Verified</span>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </Card>
      </section>

      {/* ── INTERACTIVE RATE CALCULATOR ─────────────────────────────── */}
      <section id="calculator" className="py-16 md:py-20 bg-white border-y border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <Badge variant="lime">Algorithmic Rate Engine</Badge>
                <h2 className="text-3xl font-extrabold text-[#064E3B] tracking-tight mt-2">
                  Instant Shipping Rate Estimator
                </h2>
                <p className="text-sm text-[#1F2937]/80 mt-1 leading-relaxed">
                  Transparent pricing based on distance, weight, and delivery speed. No hidden fees or unexpected surcharges.
                </p>
              </div>

              {/* Package Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Quick Package Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {packagePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setWeightKg(preset.weight);
                        setDistanceKm(preset.dist);
                      }}
                      className="text-left p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#16A34A] bg-[#F8FAF8] text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-[#064E3B] truncate">{preset.label}</div>
                      <div className="text-[#64748B] text-[11px] mt-0.5">{preset.weight}kg • {preset.dist}km</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders & Direct Inputs */}
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-[#1F2937] mb-1.5">
                    <span>Distance (Kilometers)</span>
                    <span className="font-mono text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {distanceKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full accent-[#16A34A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748B] mt-0.5">
                    <span>1 km (Local)</span>
                    <span>50 km (Greater Colombo)</span>
                    <span>100 km (Inter-city)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-[#1F2937] mb-1.5">
                    <span>Package Weight (KG)</span>
                    <span className="font-mono text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {weightKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="25"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full accent-[#16A34A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748B] mt-0.5">
                    <span>0.5 kg (Document)</span>
                    <span>10 kg (Medium Box)</span>
                    <span>25 kg (Cargo)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Delivery Speed Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "Standard", label: "Standard", sub: "Next Day" },
                      { id: "Express", label: "Express", sub: "Same Day" },
                      { id: "SameDay", label: "Flash", sub: "2-3 Hours" },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTier(tier.id)}
                        className={`text-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selectedTier === tier.id
                            ? "border-[#064E3B] bg-[#064E3B] text-white shadow-sm"
                            : "border-[#E5E7EB] bg-[#F8FAF8] text-[#1F2937] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        <div className="text-xs font-bold">{tier.label}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedTier === tier.id ? "text-emerald-200" : "text-[#64748B]"}`}>
                          {tier.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md"
                  onClick={handleCalculatePrice}
                  disabled={calcLoading}
                >
                  <Calculator className="h-4 w-4" />
                  {calcLoading ? "Calculating Quote..." : "Recalculate Estimate"}
                </Button>
              </div>
            </div>

            {/* Right Result Card */}
            <div className="lg:col-span-6">
              <Card className="bg-[#064E3B] text-white border-0 shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-[#043729] pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[#A3E635]" />
                      Estimated Shipping Quote
                    </CardTitle>
                    <Badge variant="lime" className="text-xs font-bold">
                      {calcResult?.tier_name || selectedTier} Tier
                    </Badge>
                  </div>
                  <CardDescription className="text-emerald-200 text-xs">
                    Live computation from <code className="text-[#A3E635] bg-emerald-950 px-1 py-0.5 rounded">PricingService</code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Total Estimated Price</span>
                      <div className="text-4xl font-extrabold text-[#A3E635] tracking-tight mt-0.5">
                        Rs. {calcResult ? Math.round(calcResult.total_price).toLocaleString() : (350 + distanceKm * 45 + weightKg * 80).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-xs text-emerald-200">
                      <div>LKR (Sri Lankan Rupee)</div>
                      <div className="text-[#A3E635] font-semibold">Taxes Included</div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-emerald-100">
                    <div className="flex justify-between py-1.5 border-b border-white/10">
                      <span>Base Service Fee ({selectedTier})</span>
                      <span className="font-mono text-white">Rs. {calcResult ? Math.round(calcResult.base_rate) : (selectedTier === "Express" ? 500 : 350)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/10">
                      <span>Distance Surcharge ({distanceKm} km @ Rs. 45/km)</span>
                      <span className="font-mono text-white">Rs. {calcResult ? Math.round(calcResult.distance_cost) : distanceKm * 45}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span>Weight Surcharge ({weightKg} kg @ Rs. 80/kg)</span>
                      <span className="font-mono text-white">Rs. {calcResult ? Math.round(calcResult.weight_cost) : Math.round(weightKg * 80)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href={user ? "/customer/book" : "/login"}>
                      <Button variant="lime" className="w-full font-bold text-[#064E3B] shadow-md">
                        Book Pickup at This Rate
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ── COVERAGE & ZONES SECTION ────────────────────────────────── */}
      <section id="team" className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="success">Island-Wide Infrastructure</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] tracking-tight">
            Strategic Urban Delivery Zones
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] max-w-2xl mx-auto">
            Our hub-and-spoke distribution model connects major city centers with localized motorcycle couriers for rapid last-mile drop-offs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {deliveryZones.map((zone) => (
            <Card key={zone.code} className="border border-[#E5E7EB] hover:border-[#16A34A] transition-all bg-white hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-[#16A34A] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {zone.code}
                  </span>
                  <Badge variant={zone.status === "High Demand" ? "lime" : "secondary"}>
                    {zone.status}
                  </Badge>
                </div>
                <CardTitle className="text-base text-[#064E3B]">{zone.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                  <span className="text-[#64748B]">Active Couriers</span>
                  <span className="font-semibold text-[#1F2937]">{zone.activeCouriers} couriers on grid</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Avg Transit Time</span>
                  <span className="font-semibold text-[#16A34A]">{zone.avgMins} minutes</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Special Hub Card */}
          <Card className="border-2 border-dashed border-[#16A34A]/40 bg-emerald-50/50 flex flex-col justify-center items-center text-center p-6">
            <MapPin className="h-8 w-8 text-[#16A34A] mb-2" />
            <h4 className="font-bold text-[#064E3B] text-base">Outstation &amp; Inter-Province</h4>
            <p className="text-xs text-[#64748B] mt-1 max-w-xs">
              Daily overnight trunk line connects Kandy, Galle, Gampaha, Kurunegala, and Jaffna.
            </p>
            <div className="mt-3">
              <Link href={user ? "/customer/dashboard" : "/login"}>
                <Button variant="outline" size="sm" className="font-semibold text-xs">
                  View Outstation Rates
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ── ENGINEERING & ARCHITECTURE (COLLAPSIBLE / EAD SHOWCASE) ── */}
      <section id="architecture" className="py-12 bg-[#F1F5F1] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E3B] uppercase tracking-wider mb-1">
                  <Code className="h-4 w-4 text-[#16A34A]" />
                  Architecture &amp; System Health
                </div>
                <h3 className="text-xl font-extrabold text-[#064E3B]">
                  Under the Hood: Enterprise Modular Monolith
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Built with Next.js 16 (Turbopack), FastAPI (AsyncPG), Neon PostgreSQL, and RabbitMQ.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${isHealthy ? "bg-[#16A34A] animate-pulse" : "bg-amber-500"}`} />
                  <span className="font-semibold">{isHealthy ? "FastAPI Online" : "Checking..."}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTechSectionOpen(!techSectionOpen)}
                  className="font-semibold text-xs"
                >
                  {techSectionOpen ? "Hide Modules" : "Inspect 10 Modules"}
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${techSectionOpen ? "rotate-90" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Expandable Module Breakdown */}
            {techSectionOpen && (
              <div id="modules" className="mt-6 pt-6 border-t border-[#E5E7EB] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5E7EB] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-semibold text-xs text-[#064E3B]">
                            <Icon className="h-4 w-4 text-[#16A34A]" />
                            {mod.title}
                          </div>
                          <span className="text-[10px] font-mono text-[#64748B]">#{idx + 1}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">{mod.desc}</p>
                        <div className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-[#E5E7EB] truncate">
                          backend/{mod.path}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ───────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-[#064E3B] to-[#043729] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge variant="lime" className="text-xs px-3 py-1 font-bold">
            Start Shipping Today
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Ready for courier deliveries that arrive on time?
          </h2>
          <p className="text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto">
            Join hundreds of individuals and businesses sending parcels with digital proof, live GPS tracking, and instant delivery notifications.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href={user ? "/customer/book" : "/login?view=sign_up"}>
              <Button variant="lime" size="lg" className="font-bold text-[#064E3B] shadow-xl sm:px-8">
                <Package className="h-5 w-5" />
                Book Your First Parcel
              </Button>
            </Link>
            <Link href="/merchant/register">
              <Button variant="outline" size="lg" className="font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 sm:px-8">
                <Store className="h-5 w-5" />
                E-Commerce API Signup
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
