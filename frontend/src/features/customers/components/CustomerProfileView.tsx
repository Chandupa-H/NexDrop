"use client";

import { useState } from "react";
import { User, MapPin, Mail, Phone, ShieldCheck, Pencil, X, Check, AlertCircle, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import type { CustomerProfile } from "../types";
import { updateCustomerProfile, deleteCustomerProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { logoutAction } from "@/lib/auth/logout";

interface CustomerProfileViewProps {
  initialProfile: CustomerProfile;
}

export function CustomerProfileView({ initialProfile }: CustomerProfileViewProps) {
  const [profile, setProfile] = useState<CustomerProfile>(initialProfile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [defaultAddress, setDefaultAddress] = useState(profile.defaultAddress);
  const [city, setCity] = useState(profile.city);
  const [postalCode, setPostalCode] = useState(profile.postalCode);

  const handleOpenEdit = () => {
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setDefaultAddress(profile.defaultAddress);
    setCity(profile.city);
    setPostalCode(profile.postalCode);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Contact number is required.");
      return;
    }
    if (!defaultAddress.trim()) {
      setError("Street address is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updatedDto = await updateCustomerProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        default_address: defaultAddress.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
      });

      const updated = mapCustomerProfile(updatedDto);
      setProfile(updated);
      setIsEditModalOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteCustomerProfile();
      await logoutAction();
    } catch {
      setDeleteError("Failed to delete profile. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full mx-auto">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal contact information and delivery preferences"
        action={
          <Button
            type="button"
            onClick={handleOpenEdit}
            className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-medium px-4 py-2 h-auto rounded-xl gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        }
      />

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Contact Information" subtitle="Your primary details for notifications">
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Full Name
                </p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">
                  {profile.fullName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Email Address
                </p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Contact Number
                </p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">
                  {profile.phone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Account Role
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)] capitalize">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Default Delivery Address" subtitle="Used automatically for pickup & drop-offs">
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--dashboard-control-bg)] text-[var(--dashboard-primary)]">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--dashboard-muted)] uppercase tracking-wider">
                  Street Address
                </p>
                <p className="text-base font-semibold text-[var(--dashboard-text)]">
                  {profile.defaultAddress}
                </p>
                <p className="text-sm font-medium text-[var(--dashboard-muted)]">
                  {profile.city}, {profile.postalCode}
                </p>
                <p className="text-sm text-[var(--dashboard-muted)]">Sri Lanka</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)]">
              <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                Delivery Note Preference
              </p>
              <p className="text-sm text-[var(--dashboard-muted)] mt-1.5 leading-relaxed">
                Couriers will attempt delivery during standard daytime hours (8:00 AM – 6:00 PM).
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Danger Zone: Delete Profile */}
      <div className="p-6 rounded-2xl border border-red-200 bg-red-50/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Profile
            </h3>
            <p className="text-sm text-red-800/80">
              Permanently delete your profile, default addresses, and associated customer preferences.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 h-auto rounded-xl gap-2 cursor-pointer shrink-0 shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Profile
          </Button>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--dashboard-surface)] rounded-2xl border border-[var(--dashboard-hairline)] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dashboard-hairline)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--dashboard-text)]">
                  Edit Profile
                </h3>
                <p className="text-sm text-[var(--dashboard-muted)] mt-0.5">
                  Update your contact details and default delivery address
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="p-1.5 rounded-lg text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-neutral-bg)] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Full Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-gray-100 text-sm text-[var(--dashboard-muted)] cursor-not-allowed"
                />
                <span className="text-xs sm:text-sm text-[var(--dashboard-muted)] block mt-1">Email is linked to account authentication and cannot be edited.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Contact Number <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="+94 77 123 4567"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Street Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={defaultAddress}
                  onChange={(e) => setDefaultAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="e.g. 45/2 Temple Road"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                    placeholder="e.g. Colombo 07"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                    placeholder="e.g. 00700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--dashboard-hairline)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="text-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white text-sm font-semibold cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--dashboard-surface)] rounded-2xl border border-red-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--dashboard-text)]">
                  Delete Customer Profile?
                </h3>
                <p className="text-sm text-[var(--dashboard-muted)] mt-1 leading-relaxed">
                  Are you sure you want to delete your profile? All personal contact details and delivery preferences will be permanently wiped. This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--dashboard-hairline)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
