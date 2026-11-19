"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Building,
  Check,
  Copy,
  Trash2,
  ArrowRight,
  X,
  Star,
  Pencil,
  Truck,
  Store,
  User,
} from "lucide-react";
import { SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ThemedSelect } from "@/components/ui/themed-select";
import { SRI_LANKA_HUBS } from "../constants/destinations";
import {
  useSavedAddresses,
  type SavedAddress,
  type AddressType,
} from "../hooks/useSavedAddresses";

export type { SavedAddress, AddressType };

export interface SavedAddressesCardProps {
  initialAddress?: string;
  city?: string;
  postalCode?: string;
  userName?: string;
  limit?: number;
  showViewAllLink?: boolean;
  isDashboardView?: boolean;
  title?: string;
  subtitle?: string;
}

const CITIES = [
  "Colombo 01",
  "Colombo 03",
  "Colombo 07",
  "Dehiwala",
  "Gampaha",
  "Kadawatha",
  "Kandy",
  "Negombo",
  "Galle",
  "Kurunegala",
  "Ratnapura",
  "Matara",
];

export function SavedAddressesCard({
  initialAddress = "45/2 Temple Road",
  city = "Colombo 07",
  postalCode = "00700",
  userName = "Dihini Kankanamage",
  limit,
  showViewAllLink = false,
  isDashboardView = false,
  title = "Saved Addresses",
  subtitle,
}: SavedAddressesCardProps) {
  const isDashboard = isDashboardView || Boolean(limit);

  const {
    addresses,
    setDefault,
    deleteAddress,
    addAddress,
    updateAddress,
    setAddresses,
  } = useSavedAddresses(initialAddress, city, postalCode, userName);

  const [activeTab, setActiveTab] = useState<"all" | "pickup" | "dropoff">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form states
  const [newAddressType, setNewAddressType] = useState<AddressType>("pickup");
  const [newLabel, setNewLabel] = useState<SavedAddress["label"]>("Home");
  const [newCustomName, setNewCustomName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newContactName, setNewContactName] = useState(userName);
  const [newPhone, setNewPhone] = useState("+94 77 123 4567");
  const [newIsDefault, setNewIsDefault] = useState(false);

  const filteredAddresses = addresses.filter((a) => {
    if (activeTab === "all") return true;
    return a.addressType === activeTab;
  });

  const sortedAddresses = [...filteredAddresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });

  const displayedAddresses = limit
    ? sortedAddresses.slice(0, limit)
    : sortedAddresses;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setNewAddressType(activeTab === "dropoff" ? "dropoff" : "pickup");
    setNewLabel(activeTab === "dropoff" ? "Client" : "Home");
    setNewCustomName("");
    setNewAddress("");
    setNewCity("");
    setNewPostalCode("");
    setNewContactName(userName);
    setNewPhone("+94 77 123 4567");
    setNewIsDefault(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: SavedAddress) => {
    setEditingAddressId(item.id);
    setNewAddressType(item.addressType);
    setNewLabel(item.label);
    setNewCustomName(item.customName || "");
    setNewAddress(item.address);
    setNewCity(item.city);
    setNewPostalCode(item.postalCode);
    setNewContactName(item.contactName || userName);
    setNewPhone(item.phone || "+94 77 123 4567");
    setNewIsDefault(Boolean(item.isDefault));
    setShowAddModal(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim() || !newCity) return;

    if (editingAddressId) {
      updateAddress(editingAddressId, {
        addressType: newAddressType,
        label: newLabel,
        customName:
          newLabel === "Other"
            ? newCustomName || "Other Address"
            : newCustomName || undefined,
        address: newAddress.trim(),
        city: newCity,
        postalCode: newPostalCode.trim() || "00100",
        contactName: newContactName.trim() || userName,
        phone: newPhone.trim(),
        isDefault: newIsDefault,
      });
    } else {
      addAddress({
        addressType: newAddressType,
        label: newLabel,
        customName:
          newLabel === "Other"
            ? newCustomName || "Other Address"
            : newCustomName || undefined,
        address: newAddress.trim(),
        city: newCity,
        postalCode: newPostalCode.trim() || "00100",
        contactName: newContactName.trim() || userName,
        phone: newPhone.trim(),
      });
    }

    setShowAddModal(false);
    setEditingAddressId(null);
    setNewAddress("");
    setNewPostalCode("");
  };

  const getLabelIcon = (label: SavedAddress["label"]) => {
    switch (label) {
      case "Home":
        return <Home className="w-4 h-4 text-emerald-600" />;
      case "Office":
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      case "Warehouse":
        return <Building className="w-4 h-4 text-emerald-600" />;
      case "Client":
        return <User className="w-4 h-4 text-emerald-600" />;
      case "Store":
        return <Store className="w-4 h-4 text-emerald-600" />;
      default:
        return <MapPin className="w-4 h-4 text-emerald-600" />;
    }
  };

  const pickupCount = addresses.filter((a) => a.addressType === "pickup").length;
  const dropoffCount = addresses.filter((a) => a.addressType === "dropoff").length;

  const cardSubtitle =
    subtitle ||
    (limit
      ? "Most frequently used pickup/destination addresses"
      : "Frequently used pickup locations & recipient destinations for rapid 1-click booking");

  return (
    <SectionCard
      title={title}
      subtitle={cardSubtitle}
      action={
        <div className="flex items-center gap-2">
          {isDashboard && (
            <Link
              href="/customer/addresses"
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] hover:bg-[var(--dashboard-control-bg)] hover:border-[var(--dashboard-primary)]/40 text-sm font-semibold text-[var(--dashboard-primary)] transition-colors shadow-2xs cursor-pointer h-9"
            >
              <span>View All</span>
            </Link>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white text-sm h-9 px-3.5 gap-1.5 cursor-pointer shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Purpose Filter Pills (Hidden on Dashboard, visible on dedicated Saved Addresses page) */}
        {!isDashboard && (
          <div className="flex items-center gap-2 border-b border-[var(--dashboard-hairline)] pb-3 text-sm flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-[var(--dashboard-primary)] text-white shadow-xs"
                  : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)]"
              }`}
            >
              All Addresses ({addresses.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pickup")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                activeTab === "pickup"
                  ? "bg-[var(--dashboard-primary)] text-white shadow-xs"
                  : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-control-bg)]"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Pickup Locations ({pickupCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("dropoff")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                activeTab === "dropoff"
                  ? "bg-[var(--dashboard-primary)] text-white shadow-xs"
                  : "text-[var(--dashboard-muted)] hover:text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-control-bg)]"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Drop-off Destinations ({dropoffCount})</span>
            </button>
          </div>
        )}

        {/* Addresses List */}
        {displayedAddresses.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--dashboard-muted)]">
            No {activeTab === "pickup" ? "pickup" : activeTab === "dropoff" ? "drop-off" : ""} addresses saved yet. Click &quot;Add Address&quot; to save one.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAddresses.map((item) => {
              const isPickup = item.addressType === "pickup";

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isDefault
                      ? "border-[var(--dashboard-primary)]/60 bg-[var(--dashboard-surface)] shadow-xs"
                      : "border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]/50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white border border-[var(--dashboard-hairline)] shrink-0 mt-0.5 shadow-2xs">
                      {getLabelIcon(item.label)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[var(--dashboard-text)]">
                          {item.customName || item.label}
                        </span>

                        {/* Distinct Purpose Badge */}
                        {isPickup ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" /> Pickup Location
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Drop-off Destination
                          </span>
                        )}

                        {item.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Star className="w-3.5 h-3.5 fill-emerald-700 text-emerald-700" /> Default {isPickup ? "Pickup" : "Destination"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--dashboard-muted)] truncate max-w-xl">
                        {item.address}, {item.city} ({item.postalCode})
                      </p>
                      {item.contactName && (
                        <p className="text-sm text-[var(--dashboard-muted)]">
                          Contact: {item.contactName} • {item.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, `${item.address}, ${item.city}, ${item.postalCode}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-control-bg)] hover:border-[var(--dashboard-primary)]/40 transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[var(--dashboard-primary)]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-control-bg)] hover:border-[var(--dashboard-primary)]/40 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-[var(--dashboard-primary)]" />
                      <span>Edit</span>
                    </button>

                    {/* Differentiated Booking Button */}
                    {isPickup ? (
                      <Link
                        href={`/customer/book?type=pickup&address=${encodeURIComponent(item.address)}&city=${encodeURIComponent(item.city)}&name=${encodeURIComponent(item.contactName || "")}&phone=${encodeURIComponent(item.phone || "")}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)] hover:text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Book Pickup</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        href={`/customer/book?type=dropoff&address=${encodeURIComponent(item.address)}&city=${encodeURIComponent(item.city)}&destinationCity=${encodeURIComponent(item.city)}&destination=${encodeURIComponent(item.city)}&name=${encodeURIComponent(item.contactName || "")}&phone=${encodeURIComponent(item.phone || "")}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)] hover:text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Book Delivery</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--dashboard-surface)] rounded-2xl border border-[var(--dashboard-hairline)] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dashboard-hairline)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--dashboard-text)]">
                  {editingAddressId ? "Edit Saved Address" : "Save New Address"}
                </h3>
                <p className="text-sm text-[var(--dashboard-muted)] mt-0.5">
                  {editingAddressId
                    ? "Update your saved pickup or drop-off address"
                    : "Add a new address for faster delivery booking"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAddressId(null);
                }}
                className="p-1.5 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)] transition-colors cursor-pointer focus:outline-none focus:ring-0 outline-none"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-sm">
              {/* Purpose Selector */}
              <div>
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                  Address Purpose <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewAddressType("pickup")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      newAddressType === "pickup"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-[var(--dashboard-surface)] border-[var(--dashboard-hairline)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)]"
                    }`}
                  >
                    <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Pickup Location</p>
                      <p className="text-xs text-[var(--dashboard-muted)] font-normal">Courier collects from here</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAddressType("dropoff")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      newAddressType === "dropoff"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-[var(--dashboard-surface)] border-[var(--dashboard-hairline)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)]"
                    }`}
                  >
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Drop-off Destination</p>
                      <p className="text-xs text-[var(--dashboard-muted)] font-normal">Recipient delivery address</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Label Selector */}
              <div>
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                  Address Label
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Home", "Office", "Warehouse", "Client", "Store", "Other"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewLabel(lbl)}
                      className={`py-2 px-2.5 rounded-xl border text-sm font-medium text-center transition-colors cursor-pointer ${
                        newLabel === lbl
                          ? "bg-[var(--dashboard-primary)] text-white border-[var(--dashboard-primary)] font-semibold shadow-xs"
                          : "bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] border-[var(--dashboard-hairline)] hover:bg-[var(--dashboard-neutral-bg)]"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {newLabel === "Other" && (
                <div>
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                    Custom Label Name
                  </label>
                  <input
                    type="text"
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    placeholder="e.g. Studio, Branch #2"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                  Street Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 123 High Level Road"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                    City / Town <span className="text-red-500 font-bold">*</span>
                  </label>
                  <ThemedSelect
                    options={SRI_LANKA_HUBS.map((h) => ({
                      value: h.city,
                      label: h.city,
                    }))}
                    value={newCity}
                    onChange={setNewCity}
                    placeholder="Select Destination City / Regional Hub..."
                    textSize="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={newPostalCode}
                    onChange={(e) => setNewPostalCode(e.target.value)}
                    placeholder="e.g. 00500"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--dashboard-hairline)]">
                <div className="flex items-center gap-2">
                  {editingAddressId && (
                    <>
                      <button
                        type="button"
                        disabled={newIsDefault}
                        onClick={() => {
                          if (editingAddressId && !newIsDefault) {
                            deleteAddress(editingAddressId);
                            setShowAddModal(false);
                            setEditingAddressId(null);
                          }
                        }}
                        title={newIsDefault ? "Default address cannot be deleted" : "Delete Address"}
                        aria-label={newIsDefault ? "Default address cannot be deleted" : "Delete Address"}
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border border-red-200 flex items-center justify-center rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-red-400 focus:outline-none focus:ring-0 outline-none select-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewIsDefault((prev) => !prev)}
                        title={newIsDefault ? "Remove default status" : "Set as Default"}
                        aria-label={newIsDefault ? "Remove default status" : "Set as Default"}
                        className={`h-9 w-9 p-0 rounded-lg border flex items-center justify-center cursor-pointer transition-all focus:outline-none focus:ring-0 outline-none select-none ${
                          newIsDefault
                            ? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-2xs"
                            : "bg-white border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            newIsDefault ? "fill-emerald-600 text-emerald-600" : ""
                          }`}
                        />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingAddressId(null);
                    }}
                    className="text-sm cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newAddress.trim() || !newCity}
                    className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white text-sm font-semibold px-4 h-9 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingAddressId ? "Update Address" : "Save Address"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
