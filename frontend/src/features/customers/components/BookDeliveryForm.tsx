"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { SectionCard } from "@/components/dashboard";
import {
  Package,
  MapPin,
  User,
  Phone,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Ruler,
  Tag,
  FileText,
} from "lucide-react";
import { SRI_LANKA_HUBS, SERVICE_TIERS, type ServiceTierOption } from "../constants/destinations";
import { createCustomerParcel, getCustomerAddresses } from "../api/customer.api";
import type { CustomerParcelDetailDTO } from "../api/customer.dto";
import { mapDtoToSavedAddress, type SavedAddress } from "../hooks/useSavedAddresses";

function resolveHubCity(inputCity: string): string {
  if (!inputCity) return SRI_LANKA_HUBS[0].city;
  const clean = inputCity.toLowerCase().trim();
  const exact = SRI_LANKA_HUBS.find((h) => h.city.toLowerCase() === clean);
  if (exact) return exact.city;
  const prefix = SRI_LANKA_HUBS.find(
    (h) => clean.startsWith(h.city.toLowerCase()) || h.city.toLowerCase().startsWith(clean)
  );
  if (prefix) return prefix.city;
  const contains = SRI_LANKA_HUBS.find(
    (h) => clean.includes(h.city.toLowerCase()) || h.city.toLowerCase().includes(clean)
  );
  if (contains) return contains.city;
  return inputCity;
}

function getStoredDefaults(): { pickup?: SavedAddress; dropoff?: SavedAddress } {
  if (typeof window === "undefined") return {};
  try {
    let pickup: SavedAddress | undefined;
    let dropoff: SavedAddress | undefined;

    const rawAll = localStorage.getItem("nexdrop_customer_saved_addresses");
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (Array.isArray(parsed)) {
        pickup = parsed.find((a: SavedAddress) => a.addressType === "pickup" && Boolean(a.isDefault));
        dropoff = parsed.find((a: SavedAddress) => a.addressType === "dropoff" && Boolean(a.isDefault));
        // Master list is authoritative; do not fall back to separate stale keys
        return { pickup, dropoff };
      }
    }

    const rawP = localStorage.getItem("nexdrop_customer_default_pickup");
    if (rawP) {
      const parsedP = JSON.parse(rawP);
      if (parsedP && parsedP.isDefault) pickup = parsedP;
    }
    const rawD = localStorage.getItem("nexdrop_customer_default_dropoff");
    if (rawD) {
      const parsedD = JSON.parse(rawD);
      if (parsedD && parsedD.isDefault) dropoff = parsedD;
    }

    return { pickup, dropoff };
  } catch {
    return {};
  }
}

interface BookDeliveryFormProps {
  customerName?: string;
  defaultAddress?: string;
  defaultCity?: string;
  customerPhone?: string;
  initialDefaultPickup?: SavedAddress;
  initialDefaultDropoff?: SavedAddress;
}

export function BookDeliveryForm({
  customerName = "",
  defaultAddress = "",
  defaultCity = "",
  customerPhone = "",
  initialDefaultPickup,
  initialDefaultDropoff,
}: BookDeliveryFormProps) {
  const searchParams = useSearchParams();
  const paramType = searchParams.get("type"); // "pickup" or "dropoff"
  const paramAddress = searchParams.get("address") || "";
  const paramCity = searchParams.get("city") || "";
  const paramName = searchParams.get("name") || "";
  const paramPhone = searchParams.get("phone") || "";
  const paramDestinationCity = searchParams.get("destinationCity") || searchParams.get("destination") || "";

  const localDefaults = getStoredDefaults();
  const effectivePickup = initialDefaultPickup || localDefaults.pickup;
  const effectiveDropoff = initialDefaultDropoff || localDefaults.dropoff;

  const hasDefaultPickup = Boolean(effectivePickup?.isDefault);
  const hasDefaultDropoff = Boolean(effectiveDropoff?.isDefault);

  // Helper to read destination with fallback across searchParams, window.location.search, and sessionStorage
  const getInitialDestination = (): string => {
    const fromParams =
      searchParams.get("destination") ||
      searchParams.get("destinationCity") ||
      (paramType === "dropoff" ? paramCity : "");
    if (fromParams) return resolveHubCity(fromParams);

    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const direct =
          urlParams.get("destination") ||
          urlParams.get("destinationCity") ||
          (urlParams.get("type") === "dropoff" ? urlParams.get("city") : "");
        if (direct) return resolveHubCity(direct);

        const stored = sessionStorage.getItem("nexdrop_estimator_destination");
        if (stored) {
          sessionStorage.removeItem("nexdrop_estimator_destination");
          return resolveHubCity(stored);
        }
      } catch {
        // ignore
      }
    }
    return "";
  };

  const getInitialWeight = (): number => {
    const fromParams = searchParams.get("weight") || searchParams.get("weightKg");
    if (fromParams) {
      const parsed = parseFloat(fromParams);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }

    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const direct = urlParams.get("weight") || urlParams.get("weightKg");
        if (direct) {
          const parsed = parseFloat(direct);
          if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }

        const stored = sessionStorage.getItem("nexdrop_estimator_weight");
        if (stored) {
          sessionStorage.removeItem("nexdrop_estimator_weight");
          const parsed = parseFloat(stored);
          if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return 1.0;
  };

  const isDropoff = paramType === "dropoff";

  // Form State - Sender (Pickup Location)
  // Only autofill if:
  // 1. Explicitly provided via URL params (e.g. clicking "Book Pickup" / "Send Here")
  // 2. OR a default pickup address is chosen
  const [senderName, setSenderName] = useState(
    !isDropoff && paramName
      ? paramName
      : hasDefaultPickup
        ? effectivePickup?.contactName || ""
        : ""
  );
  const [senderPhone, setSenderPhone] = useState(
    !isDropoff && paramPhone
      ? paramPhone
      : hasDefaultPickup
        ? effectivePickup?.phone || ""
        : ""
  );
  const [pickupAddress, setPickupAddress] = useState(
    !isDropoff && paramAddress
      ? paramAddress
      : hasDefaultPickup
        ? effectivePickup?.address || ""
        : ""
  );
  const [pickupCity, setPickupCity] = useState(
    !isDropoff && paramCity
      ? paramCity
      : hasDefaultPickup
        ? effectivePickup?.city || ""
        : ""
  );

  // Form State - Recipient (Drop-off Location)
  // Only autofill if:
  // 1. Explicitly provided via URL params (e.g. clicking "Send Here")
  // 2. OR a default dropoff address is chosen
  const [recipientName, setRecipientName] = useState(
    isDropoff && paramName
      ? paramName
      : hasDefaultDropoff
        ? effectiveDropoff?.contactName || ""
        : ""
  );
  const [recipientPhone, setRecipientPhone] = useState(
    isDropoff && paramPhone
      ? paramPhone
      : hasDefaultDropoff
        ? effectiveDropoff?.phone || ""
        : ""
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    isDropoff && paramAddress
      ? paramAddress
      : hasDefaultDropoff
        ? effectiveDropoff?.address || ""
        : ""
  );
  const [destinationCity, setDestinationCity] = useState<string>(() => {
    const fromInit = getInitialDestination();
    if (fromInit) return fromInit;
    if (hasDefaultDropoff && effectiveDropoff?.city) return resolveHubCity(effectiveDropoff.city);
    return "";
  });

  // Form State - Package & Dimensions
  const [weightKg, setWeightKg] = useState<number>(getInitialWeight);

  // Synchronize when query params change, component mounts, or default address is chosen
  useEffect(() => {
    let destVal =
      searchParams.get("destination") ||
      searchParams.get("destinationCity");
    let weightVal =
      searchParams.get("weight") ||
      searchParams.get("weightKg");

    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (!destVal) destVal = urlParams.get("destination") || urlParams.get("destinationCity");
        if (!weightVal) weightVal = urlParams.get("weight") || urlParams.get("weightKg");

        if (!destVal) {
          const stored = sessionStorage.getItem("nexdrop_estimator_destination");
          if (stored) {
            destVal = stored;
            sessionStorage.removeItem("nexdrop_estimator_destination");
          }
        }
        if (!weightVal) {
          const stored = sessionStorage.getItem("nexdrop_estimator_weight");
          if (stored) {
            weightVal = stored;
            sessionStorage.removeItem("nexdrop_estimator_weight");
          }
        }
      } catch {
        // ignore
      }
    }

    if (destVal) {
      setDestinationCity(resolveHubCity(destVal));
    }
    if (weightVal) {
      const parsed = parseFloat(weightVal);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setWeightKg(Math.min(30, Math.max(0.5, parsed)));
      }
    }

    const applyDefaults = (pickup?: SavedAddress, dropoff?: SavedAddress) => {
      // 1. Autofill Pickup Location ONLY if a default pickup is chosen and not given via URL params
      if (paramType !== "dropoff" && !paramAddress) {
        if (pickup?.isDefault && pickup.address) {
          setPickupAddress(pickup.address);
          if (pickup.city) setPickupCity(pickup.city);
          if (pickup.contactName) setSenderName(pickup.contactName);
          if (pickup.phone) setSenderPhone(pickup.phone);
        }
      }

      // 2. Autofill Delivery Destination ONLY if a default dropoff is chosen and not given via URL params
      if (paramType !== "dropoff" && !paramAddress) {
        if (dropoff?.isDefault && dropoff.address) {
          setDeliveryAddress(dropoff.address);
          if (dropoff.contactName) setRecipientName(dropoff.contactName);
          if (dropoff.phone) setRecipientPhone(dropoff.phone);
          if (!destVal && dropoff.city) {
            setDestinationCity(resolveHubCity(dropoff.city));
          }
        }
      }
    };

    // Immediate sync from localStorage
    const stored = getStoredDefaults();
    applyDefaults(stored.pickup || initialDefaultPickup, stored.dropoff || initialDefaultDropoff);

    // Sync from backend to ensure persistent DB default address is applied
    getCustomerAddresses()
      .then((backendList) => {
        if (Array.isArray(backendList) && backendList.length > 0) {
          const mapped = backendList.map(mapDtoToSavedAddress);
          const bp = mapped.find((a) => a.addressType === "pickup" && a.isDefault);
          const bd = mapped.find((a) => a.addressType === "dropoff" && a.isDefault);
          applyDefaults(bp || stored.pickup, bd || stored.dropoff);
        }
      })
      .catch(() => {
        // offline fallback
      });

    // Explicit address from URL (e.g. from "Book Pickup" or "Send Here" in address book)
    if (paramAddress || paramCity || paramName || paramPhone || paramDestinationCity) {
      if (paramType === "dropoff" || paramDestinationCity) {
        if (paramAddress) setDeliveryAddress(paramAddress);
        const resolvedCity = resolveHubCity(paramDestinationCity || paramCity);
        if (resolvedCity) setDestinationCity(resolvedCity);
        if (paramName) setRecipientName(paramName);
        if (paramPhone) setRecipientPhone(paramPhone);
      } else {
        if (paramAddress) setPickupAddress(paramAddress);
        if (paramCity) setPickupCity(paramCity);
        if (paramName) setSenderName(paramName);
        if (paramPhone) setSenderPhone(paramPhone);
      }
    }

    // React to default address changes across tabs/modals
    const handleDefaultsChanged = () => {
      const fresh = getStoredDefaults();
      applyDefaults(fresh.pickup, fresh.dropoff);
    };

    window.addEventListener("nexdrop_default_address_changed", handleDefaultsChanged);
    window.addEventListener("storage", handleDefaultsChanged);

    return () => {
      window.removeEventListener("nexdrop_default_address_changed", handleDefaultsChanged);
      window.removeEventListener("storage", handleDefaultsChanged);
    };
  }, [paramType, paramAddress, paramCity, paramName, paramPhone, searchParams, initialDefaultPickup, initialDefaultDropoff]);
  const [lengthCm, setLengthCm] = useState<number>(0);
  const [widthCm, setWidthCm] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<number>(0);
  const [packageCategory, setPackageCategory] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedTier, setSelectedTier] = useState<ServiceTierOption["id"]>("express");

  // Submission & Validation States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdParcel, setCreatedParcel] = useState<CustomerParcelDetailDTO | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Weight-based pricing (per project specification)
  const billableWeightKg = weightKg;

  // Pricing calculation
  const currentHub = destinationCity ? SRI_LANKA_HUBS.find((h) => h.city === destinationCity) : undefined;
  const tierConfig = SERVICE_TIERS.find((t) => t.id === selectedTier) || SERVICE_TIERS[0];

  const baseRate = 250;
  const distanceFee = currentHub ? Math.round(currentHub.distanceKm * 3.5) : 0;
  const weightFee = Math.round(billableWeightKg * 80);
  const tierSurcharge = tierConfig.surcharge;
  const totalEstimatedFee = destinationCity
    ? baseRate + distanceFee + weightFee + tierSurcharge
    : baseRate + weightFee + tierSurcharge;

  const applyDimensionPreset = (l: number, w: number, h: number) => {
    setLengthCm(l);
    setWidthCm(w);
    setHeightCm(h);
  };

  const handleCopyTracking = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleResetForm = () => {
    setRecipientName("");
    setRecipientPhone("");
    setDeliveryAddress("");
    setDestinationCity("");
    setWeightKg(1.0);
    setLengthCm(0);
    setWidthCm(0);
    setHeightCm(0);
    setPackageCategory("");
    setSpecialInstructions("");
    setSelectedTier("express");
    setCreatedParcel(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!destinationCity) {
      setErrorMessage("Please select a destination city / regional hub.");
      return;
    }
    if (!recipientName.trim()) {
      setErrorMessage("Please enter the recipient's full name.");
      return;
    }
    if (!recipientPhone.trim() || recipientPhone.trim().length < 9) {
      setErrorMessage("Please enter a valid recipient contact phone number.");
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage("Please enter the full delivery street address.");
      return;
    }
    if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
      setErrorMessage("Please enter valid parcel dimensions (length, width, height must be > 0).");
      return;
    }
    if (!packageCategory) {
      setErrorMessage("Please select a package category.");
      return;
    }

    try {
      setSubmitting(true);
      const parcel = await createCustomerParcel({
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_city: destinationCity,
        pickup_address: pickupAddress.trim(),
        pickup_city: pickupCity.trim(),
        weight_kg: Number(billableWeightKg.toFixed(1)),
        dimensions: `${lengthCm} x ${widthCm} x ${heightCm} cm`,
        special_instructions: specialInstructions.trim()
          ? `[${packageCategory.toUpperCase()}] ${specialInstructions.trim()}`
          : `[${packageCategory.toUpperCase()}] Package`,
        fee: totalEstimatedFee,
      });

      setCreatedParcel(parcel);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to create delivery booking. Please check your connection and retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (createdParcel) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] shadow-[var(--dashboard-card-shadow)] text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)] mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Order Placed Successfully
            </span>
            <h2 className="text-2xl font-bold text-[var(--dashboard-text)]">
              Pickup Scheduled!
            </h2>
            <p className="text-sm text-[var(--dashboard-muted)] mt-1">
              Your courier pickup has been registered with NexDrop Dispatch. A courier will be assigned shortly.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider">
                Tracking Number
              </span>
              <button
                type="button"
                onClick={() => handleCopyTracking(createdParcel.tracking_id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--dashboard-primary)] hover:underline cursor-pointer"
              >
                {copiedTracking ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>
            <p className="text-xl font-bold text-[var(--dashboard-deep-green)]">
              {createdParcel.tracking_id}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--dashboard-hairline)] text-xs">
              <div>
                <span className="text-[var(--dashboard-muted)] block">Destination</span>
                <span className="font-semibold text-[var(--dashboard-text)]">
                  {createdParcel.delivery_city}
                </span>
              </div>
              <div>
                <span className="text-[var(--dashboard-muted)] block">Chargeable Weight</span>
                <span className="font-semibold text-[var(--dashboard-text)]">
                  {createdParcel.weight_kg} kg
                </span>
              </div>
              <div>
                <span className="text-[var(--dashboard-muted)] block">Dimensions</span>
                <span className="font-semibold text-[var(--dashboard-text)]">
                  {createdParcel.dimensions || `${lengthCm} x ${widthCm} x ${heightCm} cm`}
                </span>
              </div>
              <div>
                <span className="text-[var(--dashboard-muted)] block">Total Paid / Due</span>
                <span className="font-bold text-[var(--dashboard-primary)]">
                  Rs. {createdParcel.fee.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/customer/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--dashboard-primary)] text-white text-sm font-semibold hover:bg-[var(--dashboard-primary)]/90 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] text-sm font-semibold text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Book Another Delivery
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE BOOKING FORM
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to process booking</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Section 1: Pickup Location (Full Width) */}
      <div className="w-full">
        <SectionCard
          title="1. Pickup Location"
          subtitle="Where should our courier collect the package from?"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--dashboard-primary)]" /> Sender Full Name <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="Sender Name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--dashboard-primary)]" /> Sender Phone Number <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="+94 77 123 4567"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" /> Pickup City / Area <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="e.g. Colombo 07"
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" /> Full Pickup Address <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="Street address, apartment, landmarks..."
                required
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Section 2: Delivery Destination (Full Width) */}
      <div className="w-full">
        <SectionCard
          title="2. Delivery Destination"
          subtitle="Who is receiving this package and where?"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--dashboard-primary)]" /> Recipient Full Name <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="e.g. Recipient Name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--dashboard-primary)]" /> Recipient Phone Number <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="+94 77 123 4567"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" /> Destination City / Regional Hub <span className="text-red-500 font-bold">*</span>
              </label>
              <ThemedSelect
                value={destinationCity}
                onChange={setDestinationCity}
                placeholder="Select destination city / regional hub..."
                options={SRI_LANKA_HUBS.map((h) => ({
                  value: h.city,
                  label: `${h.city} (${h.standardDays}, ~${h.distanceKm} km)`,
                }))}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--dashboard-primary)]" /> Delivery Street Address <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                placeholder="House number, street name, landmarks..."
                required
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Section 3: Package Specifications & Dimensions (Full Width) */}
      <div className="w-full">
        <SectionCard
          title="3. Parcel Information"
          subtitle="Package dimensions, weight, category, and handling instructions"
        >
          <div className="space-y-6 pt-2">
            {/* 1. Dimensions (Length x Width x Height in cm) - FIRST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-[var(--dashboard-primary)]" /> Parcel Dimensions (L × W × H in cm) <span className="text-red-500 font-bold">*</span>
                </label>
                
              </div>

              {/* 3 Dimension Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-[var(--dashboard-muted)]">
                    Length (cm) <span className="text-red-500 font-bold">*</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    value={lengthCm}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setLengthCm(Number.isNaN(v) ? 0 : Math.max(0, v));
                    }}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-[var(--dashboard-muted)]">
                    Width (cm) <span className="text-red-500 font-bold">*</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    value={widthCm}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setWidthCm(Number.isNaN(v) ? 0 : Math.max(0, v));
                    }}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-[var(--dashboard-muted)]">
                    Height (cm) <span className="text-red-500 font-bold">*</span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    value={heightCm}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setHeightCm(Number.isNaN(v) ? 0 : Math.max(0, v));
                    }}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Dimension Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "Envelope (30×21×2)", l: 30, w: 21, h: 2 },
                  { label: "Small Box (20×15×10)", l: 20, w: 15, h: 10 },
                  { label: "Medium Box (35×25×15)", l: 35, w: 25, h: 15 },
                  { label: "Large Box (45×35×25)", l: 45, w: 35, h: 25 },
                ].map((preset) => {
                  const isActive = lengthCm === preset.l && widthCm === preset.w && heightCm === preset.h;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyDimensionPreset(preset.l, preset.w, preset.h)}
                      className={`px-3.5 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--dashboard-control-bg)] border-[var(--dashboard-primary)] text-[var(--dashboard-primary)] font-semibold"
                          : "border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Weight Slider - SECOND */}
            <div className="space-y-2 pt-4 border-t border-[var(--dashboard-hairline)]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--dashboard-primary)]" /> Actual Parcel Weight <span className="text-red-500 font-bold">*</span>
                </label>
                <span className="text-sm font-bold text-[var(--dashboard-text)]">
                  {weightKg.toFixed(1)} kg
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max={Math.max(15, Math.ceil(weightKg))}
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                className="w-full accent-[var(--dashboard-primary)] cursor-pointer"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "Document (0.5 kg)", val: 0.5 },
                  { label: "Small Box (1.0 kg)", val: 1.0 },
                  { label: "Medium Box (2.5 kg)", val: 2.5 },
                  { label: "Heavy Parcel (5.0 kg)", val: 5.0 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setWeightKg(preset.val)}
                    className={`px-3.5 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                      weightKg === preset.val
                        ? "bg-[var(--dashboard-control-bg)] border-[var(--dashboard-primary)] text-[var(--dashboard-primary)] font-semibold"
                        : "border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Category & Instructions - THIRD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--dashboard-hairline)]">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--dashboard-primary)]" /> Package Category <span className="text-red-500 font-bold">*</span>
                </label>
                <ThemedSelect
                  value={packageCategory}
                  onChange={(val) => {
                    setPackageCategory(val);
                    if (val === "document") {
                      applyDimensionPreset(30, 21, 2);
                      setWeightKg(0.5);
                    }
                  }}
                  placeholder="Select package category..."
                  options={[
                    { value: "standard", label: "Standard Box / General Merchandise" },
                    { value: "document", label: "Legal Document / Envelope" },
                    { value: "apparel", label: "Apparel, Clothing & Footwear" },
                    { value: "electronics", label: "Consumer Electronics & Gadgets" },
                    { value: "fragile", label: "Fragile / Glassware & Ceramics" },
                    { value: "pharma", label: "Pharmaceuticals & Healthcare Supplies" },
                    { value: "books", label: "Books, Stationery & Printed Media" },
                    { value: "cosmetics", label: "Cosmetics & Personal Care" },
                    { value: "jewelry", label: "Jewellery, Luxury & High-Value Items" },
                    { value: "perishable", label: "Perishable / Food Item" },
                    { value: "autoparts", label: "Automotive Parts & Hardware" },
                    { value: "home", label: "Home & Kitchen Appliances" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--dashboard-primary)]" /> Special Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] outline-none"
                  placeholder="e.g. Call before arrival, leave at front security..."
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Section 4: Delivery Tier (Full Width) */}
      <div className="w-full">
        <SectionCard
          title="4. Select Delivery Speed"
          subtitle="Choose your preferred fulfillment speed and dispatch timeline"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {SERVICE_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-[var(--dashboard-primary)] bg-[var(--dashboard-surface)] shadow-md"
                      : "border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:border-[var(--dashboard-muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-[var(--dashboard-text)]">{tier.name}</h4>
                      <p className="text-sm text-[var(--dashboard-muted)]">{tier.speed}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-[var(--dashboard-primary)] bg-[var(--dashboard-primary)] text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-sm text-[var(--dashboard-muted)] mb-3">{tier.tagline}</p>

                  <div className="pt-2 border-t border-[var(--dashboard-hairline)] flex items-center justify-between text-sm">
                    <span className="text-[var(--dashboard-muted)]">Priority Fee:</span>
                    <span className="font-bold text-[var(--dashboard-text)]">
                      {tier.surcharge > 0 ? `+ Rs. ${tier.surcharge.toFixed(2)}` : "Standard Rate"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Section 5: Rate & Order Summary (Full width at bottom) */}
      <div className="w-full">
        <SectionCard
          title="Rate & Order Summary"
          subtitle="Review transparent pricing and confirm your doorstep courier pickup"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
            {/* Left summary column: Route & details */}
            <div className="lg:col-span-4 space-y-3 p-4 rounded-xl border border-emerald-200/70 bg-[var(--dashboard-control-bg)]">
              <div className="flex items-center gap-2 text-base text-[var(--dashboard-text)]">
                <MapPin className="h-4 w-4 text-[var(--dashboard-primary)] shrink-0" />
                <span className="font-bold text-[var(--dashboard-deep-green)] truncate">
                  {destinationCity || "Select destination"}
                </span>
              </div>
              <div className="flex flex-wrap gap-y-1.5 justify-between text-sm text-[var(--dashboard-muted)] pt-1.5 border-t border-emerald-200/50">
                <span>Distance: {currentHub ? `~${currentHub.distanceKm} km` : "-"}</span>
                <span>Dimensions: {lengthCm}×{widthCm}×{heightCm} cm</span>
              </div>
              <div className="flex flex-wrap gap-y-1.5 justify-between text-sm text-[var(--dashboard-muted)]">
                <span>Weight: {weightKg.toFixed(1)} kg</span>
                <span className="font-semibold text-[var(--dashboard-deep-green)]">
                  Billable: {weightKg.toFixed(1)} kg
                </span>
              </div>
              <div className="text-sm text-[var(--dashboard-muted)] pt-1.5 border-t border-emerald-200/50">
                Speed: <span className="font-semibold text-[var(--dashboard-text)]">{tierConfig.name} ({tierConfig.speed})</span>
              </div>
            </div>

            {/* Middle summary column: Price Breakdown */}
            <div className="lg:col-span-5 space-y-2 text-sm text-[var(--dashboard-muted)]">
              <div className="flex justify-between">
                <span>Base Pickup Fee</span>
                <span className="font-medium text-[var(--dashboard-text)]">Rs. {baseRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Fee {currentHub ? `(${currentHub.distanceKm} km @ Rs. 3.50/km)` : ""}</span>
                <span className="font-medium text-[var(--dashboard-text)]">
                  {currentHub ? `Rs. ${distanceFee.toFixed(2)}` : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Weight Fee ({weightKg.toFixed(1)} kg @ Rs. 80/kg)</span>
                <span className="font-medium text-[var(--dashboard-text)]">Rs. {weightFee.toFixed(2)}</span>
              </div>
              {tierSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>{tierConfig.name} Surcharge</span>
                  <span className="font-medium text-[var(--dashboard-text)]">+ Rs. {tierSurcharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[var(--dashboard-success-text)]">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Standard Transit Insurance
                </span>
                <span className="font-medium">Free</span>
              </div>
            </div>

            {/* Right summary column: Total & Submit CTA */}
            <div className="lg:col-span-3 space-y-3 text-center sm:text-right flex flex-col justify-center">
              <div>
                <span className="text-xs sm:text-sm text-[var(--dashboard-muted)] block font-medium">Total Estimated Amount</span>
                <div className="text-xl sm:text-2xl font-bold text-[var(--dashboard-deep-green)]">
                  {destinationCity ? `Rs. ${totalEstimatedFee.toFixed(2)}` : "-"}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-semibold text-base h-11 gap-2 shadow-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Scheduling Courier...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" />
                    Confirm & Book Delivery
                  </>
                )}
              </Button>

              <p className="text-xs text-[var(--dashboard-muted)] text-center whitespace-nowrap">
                Includes insurance & standard carriage terms.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </form>
  );
}
