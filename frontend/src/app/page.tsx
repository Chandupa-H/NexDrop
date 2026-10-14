"use client";

import { useState } from "react";
import {
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Server,
  Zap,
  Calculator,
  RefreshCw,
  Code,
  Users,
  Compass,
  Bell,
  Webhook,
} from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBackendHealth } from "@/hooks/use-health";
import apiClient, { PriceEstimateResponse } from "@/lib/api-client";

export default function Home() {
  const { health, isHealthy, isLoading, error, refetch } = useBackendHealth();

  // Interactive Pricing Calculator State
  const [distanceKm, setDistanceKm] = useState<number>(12);
  const [weightKg, setWeightKg] = useState<number>(3.5);
  const [selectedTier, setSelectedTier] = useState<string>("Standard");
  const [calcResult, setCalcResult] = useState<PriceEstimateResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

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
      // Fallback calculation for offline demo
      const base = selectedTier === "Express" ? 8 : 5;
      const distCost = Number(distanceKm) * 1.5;
      const weightCost = Number(weightKg) * 0.8;
      setCalcResult({
        tier_name: selectedTier,
        distance_km: Number(distanceKm),
        weight_kg: Number(weightKg),
        base_rate: base,
        distance_cost: distCost,
        weight_cost: weightCost,
        total_price: Math.round((base + distCost + weightCost) * 100) / 100,
      });
    } finally {
      setCalcLoading(false);
    }
  };

  const modules = [
    {
      title: "Authentication & Users",
      desc: "Role-based access (Admin, Customer, Merchant, Courier, Dispatcher) with JWT and Argon2.",
      icon: ShieldCheck,
      path: "app/modules/auth",
    },
    {
      title: "Customer Portal",
      desc: "Profile management, saved delivery addresses, recipient address book, and order logs.",
      icon: Users,
      path: "app/modules/customers",
    },
    {
      title: "Merchant Operations",
      desc: "Bulk order submission, automated API key issuance, and merchant telemetry.",
      icon: Layers,
      path: "app/modules/merchants",
    },
    {
      title: "Courier Fleet",
      desc: "Driver telemetry, live GPS coordinates, vehicle allocation, and availability switches.",
      icon: Truck,
      path: "app/modules/couriers",
    },
    {
      title: "Parcel Lifecycle",
      desc: "Barcode tracking numbers, dimensions, package weight, and state tracking machine.",
      icon: Package,
      path: "app/modules/parcels",
    },
    {
      title: "Dispatch Engine",
      desc: "Route assignments, automated parcel-to-courier pairing, and delivery workflows.",
      icon: Compass,
      path: "app/modules/dispatch",
    },
    {
      title: "Dynamic Pricing",
      desc: "Algorithmic distance and weight calculations with multi-tier rate customization.",
      icon: Calculator,
      path: "app/modules/pricing",
    },
    {
      title: "Notification Hub",
      desc: "SMS, Email, Push, and In-App alert routing for parcel milestone tracking.",
      icon: Bell,
      path: "app/modules/notifications",
    },
    {
      title: "Merchant Webhooks",
      desc: "Event-driven outgoing webhook triggers for external e-commerce integrations.",
      icon: Webhook,
      path: "app/modules/webhooks",
    },
    {
      title: "Real-time Messaging",
      desc: "WebSocket streaming channels and RabbitMQ event publication for live fleet updates.",
      icon: Zap,
      path: "app/integrations",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F1] text-[#1F2937]">
      <Navbar backendHealthy={isHealthy} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[#E5E7EB] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Badge variant="lime" className="px-3 py-1 text-xs uppercase tracking-wide">
                University EAD Project • 10-Member Monolith Foundation
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#064E3B] leading-tight">
                Modern Parcel Delivery &amp; Courier Logistics
              </h1>

              <p className="text-lg text-[#1F2937]/80 leading-relaxed max-w-2xl">
                NexDrop is an enterprise-grade modular monolith built with{" "}
                <span className="font-semibold text-[#064E3B]">Next.js</span> and{" "}
                <span className="font-semibold text-[#16A34A]">FastAPI</span>. Structured with
                clean architectural separation to power 10 independent feature teams.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById("modules");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explore Modules
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById("calculator");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Calculator className="h-4 w-4 text-[#16A34A]" />
                  Pricing Engine
                </Button>

                <a
                  href="http://localhost:8000/api/v1/health"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="ghost" size="lg">
                    <Server className="h-4 w-4 text-[#064E3B]" />
                    Test Health API
                  </Button>
                </a>
              </div>
            </div>

            {/* Live System Health Card */}
            <div className="lg:col-span-5">
              <Card className="border-2 border-[#16A34A]/30 shadow-lg bg-[#FFFFFF]">
                <CardHeader className="bg-[#F1F5F1]/60 border-b border-[#E5E7EB] pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#16A34A] animate-ping" />
                      <CardTitle className="text-base text-[#064E3B]">System Health Monitor</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetch()}
                      disabled={isLoading}
                      className="h-8 px-2"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <CardDescription>
                    Live health verification via <code className="text-xs bg-white px-1.5 py-0.5 rounded border">GET /api/v1/health</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#F1F5F1]">
                    <span className="text-sm font-medium text-[#64748B]">Backend Status</span>
                    <Badge variant={isHealthy ? "success" : "secondary"}>
                      {isHealthy ? "HEALTHY (200 OK)" : isLoading ? "CHECKING..." : "UNAVAILABLE"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-[#1F2937]">
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                      <span className="text-[#64748B]">Service Name</span>
                      <span className="font-semibold">{health?.service || "NexDrop API"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                      <span className="text-[#64748B]">API Version</span>
                      <span className="font-mono">{health?.version || "1.0.0"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                      <span className="text-[#64748B]">Environment</span>
                      <span className="font-mono uppercase">{health?.environment || "development"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                      <span className="text-[#64748B]">Database Driver</span>
                      <span>Neon PostgreSQL (AsyncPG / Psycopg)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#64748B]">Real-time Broker</span>
                      <span>RabbitMQ &amp; WebSockets</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <strong>Note:</strong> {error}. Start the backend via <code className="bg-amber-100 px-1 py-0.5 rounded">uvicorn app.main:app</code> on port 8000.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Feature Modules Grid */}
      <section id="modules" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="success">Modular Monolith Architecture</Badge>
          <h2 className="text-3xl font-extrabold text-[#064E3B] tracking-tight">
            10 Ready-to-Implement Feature Modules
          </h2>
          <p className="text-sm text-[#64748B] max-w-2xl mx-auto">
            Each module follows strict separation of concerns with dedicated <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">models.py</code>,{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">schemas.py</code>,{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">repository.py</code>,{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">service.py</code>, and{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">routes.py</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Card key={idx} className="hover:shadow-md transition-shadow group border-[#E5E7EB]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-10 w-10 rounded-lg bg-[#F1F5F1] group-hover:bg-[#064E3B] flex items-center justify-center transition-colors">
                      <Icon className="h-5 w-5 text-[#064E3B] group-hover:text-[#A3E635] transition-colors" />
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">#{idx + 1}</span>
                  </div>
                  <CardTitle className="text-base text-[#064E3B]">{mod.title}</CardTitle>
                  <CardDescription className="text-xs">{mod.desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F1] p-2 rounded border border-[#E5E7EB]">
                    backend/{mod.path}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interactive Pricing Engine Section */}
      <section id="calculator" className="py-16 bg-white border-y border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <Badge variant="lime">Live Offline Endpoint Test</Badge>
              <h2 className="text-3xl font-bold text-[#064E3B]">
                Interactive Delivery Rate Estimator
              </h2>
              <p className="text-sm text-[#1F2937]/80 leading-relaxed">
                Demonstrates the clean separation of business logic in <code className="bg-[#F1F5F1] px-1 py-0.5 rounded text-xs font-mono">PricingService</code>.
                Calculates shipping charges based on tiered base rates, per-kilometer distances, and weight coefficients without requiring database credentials.
              </p>

              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                      Distance (Kilometers)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-[#F1F5F1] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                      Package Weight (KG)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="100"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-[#F1F5F1] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                    Delivery Speed Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Standard", "Express", "SameDay"].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`text-xs py-2 px-3 rounded-lg font-medium border transition-colors cursor-pointer ${
                          selectedTier === tier
                            ? "border-[#064E3B] bg-[#064E3B] text-white"
                            : "border-[#E5E7EB] bg-[#F1F5F1] text-[#1F2937] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleCalculatePrice}
                  disabled={calcLoading}
                >
                  <Calculator className="h-4 w-4" />
                  {calcLoading ? "Calculating..." : "Calculate Price Estimate"}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Card className="bg-[#064E3B] text-white border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#A3E635]" />
                    Estimated Shipping Breakdown
                  </CardTitle>
                  <CardDescription className="text-emerald-100 text-xs">
                    Real-time result from <code className="bg-emerald-900/60 text-[#A3E635] px-1.5 py-0.5 rounded">POST /api/v1/pricing/estimate</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-200">Total Price</span>
                      <div className="text-3xl font-extrabold text-[#A3E635]">
                        ${calcResult ? calcResult.total_price.toFixed(2) : "25.80"}
                      </div>
                    </div>
                    <Badge variant="lime" className="text-xs">
                      {calcResult?.tier_name || selectedTier} Delivery
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-emerald-100">
                    <div className="flex justify-between py-1 border-b border-white/10">
                      <span>Base Service Fee</span>
                      <span className="font-mono text-white">${calcResult ? calcResult.base_rate.toFixed(2) : "5.00"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/10">
                      <span>Distance Charge ({distanceKm} km @ $1.50/km)</span>
                      <span className="font-mono text-white">${calcResult ? calcResult.distance_cost.toFixed(2) : "18.00"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Weight Charge ({weightKg} kg @ $0.80/kg)</span>
                      <span className="font-mono text-white">${calcResult ? calcResult.weight_cost.toFixed(2) : "2.80"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Team Conventions & Tech Stack */}
      <section id="architecture" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <div className="h-8 w-8 rounded bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center mb-2">
                <Code className="h-4 w-4" />
              </div>
              <CardTitle className="text-base text-[#064E3B]">Strict TypeScript &amp; Python</CardTitle>
              <CardDescription className="text-xs">
                Zero untyped code. TypeScript strict mode on frontend, Pydantic v2 schemas and Python type hints on backend.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <div className="h-8 w-8 rounded bg-[#064E3B]/10 text-[#064E3B] flex items-center justify-center mb-2">
                <Layers className="h-4 w-4" />
              </div>
              <CardTitle className="text-base text-[#064E3B]">Neon PostgreSQL Migrations</CardTitle>
              <CardDescription className="text-xs">
                Tables are managed exclusively via Alembic migrations. No auto-creation at runtime ensures reproducible schemas.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <div className="h-8 w-8 rounded bg-[#A3E635]/20 text-[#064E3B] flex items-center justify-center mb-2">
                <Zap className="h-4 w-4" />
              </div>
              <CardTitle className="text-base text-[#064E3B]">Ready for Docker &amp; CI/CD</CardTitle>
              <CardDescription className="text-xs">
                Production multi-stage Dockerfiles and docker-compose orchestration ready for local dev and cloud deployment.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Team Organization & Squad Matrix */}
      <section id="team" className="py-16 md:py-20 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <Badge variant="lime">Team Architecture Matrix</Badge>
            <h2 className="text-3xl font-extrabold text-[#064E3B] tracking-tight">
              4 Specialized Engineering Squads
            </h2>
            <p className="text-sm text-[#64748B] max-w-2xl mx-auto">
              Clear modular division of work designed for zero merge conflicts across frontend, backend, and database migrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Squad 1: Customer */}
            <Card className="border-[#E5E7EB] hover:border-[#16A34A] transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-[#F1F5F1] text-[#064E3B] flex items-center justify-center font-bold">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge variant="success">2 Members</Badge>
                </div>
                <CardTitle className="text-base text-[#064E3B]">Customer Squad</CardTitle>
                <CardDescription className="text-xs">
                  Sender portal, parcel booking, public tracking &amp; address management.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>FE:</strong> src/features/customers/<br />
                  <strong>FE:</strong> src/features/parcels/
                </div>
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>BE:</strong> app/modules/customers/<br />
                  <strong>BE:</strong> app/modules/parcels/
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Branch: <code className="text-[#16A34A]">feat/customer-*</code>
                </div>
              </CardContent>
            </Card>

            {/* Squad 2: Merchant */}
            <Card className="border-[#E5E7EB] hover:border-[#16A34A] transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-[#F1F5F1] text-[#064E3B] flex items-center justify-center font-bold">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Badge variant="success">2 Members</Badge>
                </div>
                <CardTitle className="text-base text-[#064E3B]">Merchant Squad</CardTitle>
                <CardDescription className="text-xs">
                  Business portal, bulk shipment uploads, API keys &amp; outgoing webhooks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>FE:</strong> src/features/merchants/
                </div>
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>BE:</strong> app/modules/merchants/<br />
                  <strong>BE:</strong> app/modules/webhooks/
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Branch: <code className="text-[#16A34A]">feat/merchant-*</code>
                </div>
              </CardContent>
            </Card>

            {/* Squad 3: Courier */}
            <Card className="border-[#E5E7EB] hover:border-[#16A34A] transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-[#F1F5F1] text-[#064E3B] flex items-center justify-center font-bold">
                    <Truck className="h-5 w-5" />
                  </div>
                  <Badge variant="success">2 Members</Badge>
                </div>
                <CardTitle className="text-base text-[#064E3B]">Courier Squad</CardTitle>
                <CardDescription className="text-xs">
                  Courier app, fleet telemetry, live GPS tracking &amp; shift controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>FE:</strong> src/features/couriers/
                </div>
                <div className="p-2 rounded bg-[#F1F5F1] font-mono text-[11px] text-[#064E3B]">
                  <strong>BE:</strong> app/modules/couriers/<br />
                  <strong>Realtime:</strong> /ws/ courier GPS
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Branch: <code className="text-[#16A34A]">feat/courier-*</code>
                </div>
              </CardContent>
            </Card>

            {/* Squad 4: Dispatcher, Admin, DevOps & Platform */}
            <Card className="border-[#E5E7EB] hover:border-[#16A34A] transition-all bg-[#F1F5F1]/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-[#064E3B] text-white flex items-center justify-center font-bold">
                    <Compass className="h-5 w-5 text-[#A3E635]" />
                  </div>
                  <Badge variant="lime">2 Members</Badge>
                </div>
                <CardTitle className="text-base text-[#064E3B]">Dispatcher &amp; Platform</CardTitle>
                <CardDescription className="text-xs">
                  Dispatch engine, pricing algorithm, auth, DevOps, CI/CD &amp; migrations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2 rounded bg-white font-mono text-[11px] text-[#064E3B] border border-[#E5E7EB]">
                  <strong>FE:</strong> src/features/dispatch/, auth/
                </div>
                <div className="p-2 rounded bg-white font-mono text-[11px] text-[#064E3B] border border-[#E5E7EB]">
                  <strong>BE:</strong> dispatch/, pricing/, auth/, users/<br />
                  <strong>Infra:</strong> Docker, Alembic, RabbitMQ
                </div>
                <div className="text-[11px] text-[#64748B]">
                  Branch: <code className="text-[#16A34A]">feat/platform-*</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
