"use client";

import { useRef, useState } from "react";
import { User, MapPin, Mail, Phone, ShieldCheck, Pencil, X, Check, AlertCircle, Trash2 } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import type { CustomerProfile } from "../types";
import { updateCustomerProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { profileFields, validateProfile, profileRequestError, type ProfileFieldErrors } from "../lib/profile-validation";

interface CustomerProfileViewProps {
  initialProfile: CustomerProfile;
}

export function CustomerProfileView({ initialProfile }: CustomerProfileViewProps) {
  const [profile, setProfile] = useState<CustomerProfile>(initialProfile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [unavailable, setUnavailable] = useState(false);
  const saveInFlight = useRef(false);

  // Form states
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [defaultAddress, setDefaultAddress] = useState(profile.defaultAddress);
  const [city, setCity] = useState(profile.city);
  const [postalCode, setPostalCode] = useState(profile.postalCode);

  const handleOpenEdit = () => {
    if (unavailable) return;
    setFieldErrors({});
    setSaveSuccess(false);
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
    if (unavailable || saveInFlight.current) return;
    setSaveSuccess(false);
    const validation = validateProfile({ full_name: fullName, phone, default_address: defaultAddress, city, postal_code: postalCode });
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    saveInFlight.current = true;
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
    } catch (error: unknown) {
      const failure = profileRequestError(error);
      setError(failure.message);
      setFieldErrors(failure.fields);
      setUnavailable(failure.unavailable);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
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
            disabled={unavailable}
            className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white font-medium px-4 py-2 h-auto rounded-xl gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        }
      />

      {unavailable && <p role="alert" className="text-sm text-destructive">Account editing is unavailable until your identity can be verified.</p>}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span role="status">Profile updated successfully!</span>
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
            <p id="profile-deletion-unavailable" className="text-sm text-red-800/80">
              Account deletion is disabled until verified ownership, retention and Platform account-lifecycle integration are available.
            </p>
          </div>
          <Button
            type="button"
            disabled
            aria-describedby="profile-deletion-unavailable"
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
                disabled={saving}
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="profile-full_name" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Full Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  id="profile-full_name"
                  minLength={profileFields.full_name.min}
                  maxLength={profileFields.full_name.max}
                  disabled={saving || unavailable}
                  aria-invalid={!!fieldErrors.full_name}
                  aria-describedby={fieldErrors.full_name ? "profile-full_name-error" : undefined}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="Your full name"
                  required
                />
                {fieldErrors.full_name && <p id="profile-full_name-error" className="text-sm text-destructive">{fieldErrors.full_name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-email" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  id="profile-email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-gray-100 text-sm text-[var(--dashboard-muted)] cursor-not-allowed"
                />
                <span className="text-xs sm:text-sm text-[var(--dashboard-muted)] block mt-1">Email is linked to account authentication and cannot be edited.</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-phone" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Contact Number <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  id="profile-phone"
                  minLength={profileFields.phone.min}
                  maxLength={profileFields.phone.max}
                  disabled={saving || unavailable}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? "profile-phone-error" : undefined}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="+94 77 123 4567"
                  required
                />
                {fieldErrors.phone && <p id="profile-phone-error" className="text-sm text-destructive">{fieldErrors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-default_address" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                  Street Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  id="profile-default_address"
                  minLength={profileFields.default_address.min}
                  maxLength={profileFields.default_address.max}
                  disabled={saving || unavailable}
                  aria-invalid={!!fieldErrors.default_address}
                  aria-describedby={fieldErrors.default_address ? "profile-default_address-error" : undefined}
                  value={defaultAddress}
                  onChange={(e) => setDefaultAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                  placeholder="e.g. 45/2 Temple Road"
                  required
                />
                {fieldErrors.default_address && <p id="profile-default_address-error" className="text-sm text-destructive">{fieldErrors.default_address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="profile-city" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    id="profile-city"
                    minLength={profileFields.city.min}
                    maxLength={profileFields.city.max}
                    disabled={saving || unavailable}
                    aria-invalid={!!fieldErrors.city}
                    aria-describedby={fieldErrors.city ? "profile-city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                    placeholder="e.g. Colombo 07"
                  />
                  {fieldErrors.city && <p id="profile-city-error" className="text-sm text-destructive">{fieldErrors.city}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="profile-postal_code" className="text-xs font-semibold text-[var(--dashboard-muted)] block uppercase tracking-wider">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="profile-postal_code"
                    minLength={profileFields.postal_code.min}
                    maxLength={profileFields.postal_code.max}
                    disabled={saving || unavailable}
                    aria-invalid={!!fieldErrors.postal_code}
                    aria-describedby={fieldErrors.postal_code ? "profile-postal_code-error" : undefined}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-page-bg)] text-sm text-[var(--dashboard-text)] focus:ring-2 focus:ring-[var(--dashboard-primary)] focus:outline-none"
                    placeholder="e.g. 00700"
                  />
                  {fieldErrors.postal_code && <p id="profile-postal_code-error" className="text-sm text-destructive">{fieldErrors.postal_code}</p>}
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
                  disabled={saving || unavailable}
                  className="bg-[var(--dashboard-primary)] hover:bg-[var(--dashboard-primary)]/90 text-white text-sm font-semibold cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
