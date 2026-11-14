"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Globe,
  IdCard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api-client";
import {
  changeMerchantPassword,
  getMerchantAccountProfile,
  updateMerchantAccountProfile,
} from "../api/merchant.api";
import type {
  MerchantProfileDTO,
  MerchantProfileUpdateDTO,
} from "../types";

type Notice = { kind: "success" | "error"; message: string };
type PasswordField = "current" | "new" | "confirm";
type EditableProfile = Pick<
  MerchantProfileDTO,
  | "full_name"
  | "contact_phone"
  | "business_name"
  | "business_contact_phone"
  | "business_address"
  | "business_type"
  | "website_url"
>;

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = error.data.detail;
    if (Array.isArray(details)) {
      return details.map((detail) => detail.msg).join(" ");
    }
    return typeof details === "string" ? details : error.message;
  }
  return "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function validateProfile(values: EditableProfile): string | null {
  if (values.full_name.trim().length < 2) {
    return "Full name must contain at least 2 characters.";
  }
  if (values.business_name.trim().length < 2) {
    return "Business name must contain at least 2 characters.";
  }
  if (values.business_address.trim().length < 2) {
    return "Business address must contain at least 2 characters.";
  }

  for (const phone of [values.contact_phone, values.business_contact_phone]) {
    const normalized = phone.trim();
    if (!/^\+?[0-9][0-9\s()-]*$/.test(normalized)) {
      return "Enter valid account and business contact phone numbers.";
    }
    const digits = normalized.replace(/\D/g, "").length;
    if (digits < 7 || digits > 15) {
      return "Phone numbers must contain 7 to 15 digits.";
    }
  }

  const website = values.website_url?.trim();
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Website must use an http or https URL.";
      }
    } catch {
      return "Enter a valid website URL.";
    }
  }
  return null;
}

function MerchantProfileLoading() {
  return (
    <div className="space-y-6" aria-label="Loading profile" aria-busy="true">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-[#e5eee8]" />
      <div className="h-36 animate-pulse rounded-2xl bg-[#dcebe1]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
      <span className="sr-only">Loading your merchant profile.</span>
    </div>
  );
}

export function MerchantProfileView() {
  const [profile, setProfile] = useState<MerchantProfileDTO | null>(null);
  const [form, setForm] = useState<EditableProfile>({
    full_name: "",
    contact_phone: "",
    business_name: "",
    business_contact_phone: "",
    business_address: "",
    business_type: null,
    website_url: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<PasswordField, boolean>
  >({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [securityNotice, setSecurityNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    void getMerchantAccountProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm({
          full_name: result.full_name,
          contact_phone: result.contact_phone,
          business_name: result.business_name,
          business_contact_phone: result.business_contact_phone,
          business_address: result.business_address,
          business_type: result.business_type,
          website_url: result.website_url,
        });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getMerchantAccountProfile();
      setProfile(result);
      setForm({
        full_name: result.full_name,
        contact_phone: result.contact_phone,
        business_name: result.business_name,
        business_contact_phone: result.business_contact_phone,
        business_address: result.business_address,
        business_type: result.business_type,
        website_url: result.website_url,
      });
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name,
      contact_phone: profile.contact_phone,
      business_name: profile.business_name,
      business_contact_phone: profile.business_contact_phone,
      business_address: profile.business_address,
      business_type: profile.business_type,
      website_url: profile.website_url,
    });
    setIsEditing(false);
    setProfileNotice(null);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProfile(form);
    if (validationError) {
      setProfileNotice({ kind: "error", message: validationError });
      return;
    }

    setIsSaving(true);
    setProfileNotice(null);
    try {
      const updatedProfile = await updateMerchantAccountProfile({
        full_name: form.full_name.trim(),
        contact_phone: form.contact_phone.trim(),
        business_name: form.business_name.trim(),
        business_contact_phone: form.business_contact_phone.trim(),
        business_address: form.business_address.trim(),
        business_type: form.business_type?.trim() || null,
        website_url: form.website_url?.trim() || null,
      } satisfies MerchantProfileUpdateDTO);
      setProfile(updatedProfile);
      setForm({
        full_name: updatedProfile.full_name,
        contact_phone: updatedProfile.contact_phone,
        business_name: updatedProfile.business_name,
        business_contact_phone: updatedProfile.business_contact_phone,
        business_address: updatedProfile.business_address,
        business_type: updatedProfile.business_type,
        website_url: updatedProfile.website_url,
      });
      setIsEditing(false);
      setProfileNotice({ kind: "success", message: "Your profile changes have been saved." });
    } catch (error) {
      setProfileNotice({ kind: "error", message: getApiErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (passwords.new.length < 12) {
      setSecurityNotice({
        kind: "error",
        message: "New password must be at least 12 characters.",
      });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setSecurityNotice({
        kind: "error",
        message: "Password confirmation does not match.",
      });
      return;
    }

    setSecurityNotice(null);
    setIsChangingPassword(true);
    try {
      await changeMerchantPassword({
        current_password: passwords.current,
        new_password: passwords.new,
        confirm_password: passwords.confirm,
      });
      setPasswords({ current: "", new: "", confirm: "" });
      setVisiblePasswords({ current: false, new: false, confirm: false });
      setSecurityNotice({ kind: "success", message: "Your password was updated." });
    } catch (error) {
      setSecurityNotice({ kind: "error", message: getApiErrorMessage(error) });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderPasswordField = (
    field: PasswordField,
    label: string,
    placeholder: string,
    Icon: typeof LockKeyhole
  ) => (
    <div key={field}>
      <label
        htmlFor={`merchant-password-${field}`}
        className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]"
        />
        <input
          id={`merchant-password-${field}`}
          type={visiblePasswords[field] ? "text" : "password"}
          autoComplete={field === "current" ? "current-password" : "new-password"}
          required
          minLength={field === "current" ? 1 : 12}
          maxLength={1024}
          value={passwords[field]}
          onChange={(event) =>
            setPasswords((current) => ({
              ...current,
              [field]: event.target.value,
            }))
          }
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-12 text-sm text-[#294237] outline-none placeholder:text-[#8b9b92] focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15"
        />
        <button
          type="button"
          aria-label={`${visiblePasswords[field] ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visiblePasswords[field]}
          onClick={() =>
            setVisiblePasswords((current) => ({
              ...current,
              [field]: !current[field],
            }))
          }
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5b7266] hover:bg-[#e8f5ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16a34a]"
        >
          {visiblePasswords[field] ? (
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Eye aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  if (isLoading) return <MerchantProfileLoading />;

  if (loadError || !profile) {
    return (
      <section className="rounded-2xl border border-[#f2c9c5] bg-white p-6" role="alert">
        <h1 className="text-xl font-bold text-[#0f2a1d]">
          Couldn&apos;t load your profile
        </h1>
        <p className="mt-2 text-sm text-[#5b7266]">
          {loadError ?? "Your merchant profile is unavailable right now."}
        </p>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="mt-4 rounded-lg bg-[#0b3d2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125338]"
        >
          Try again
        </button>
      </section>
    );
  }

  const statusClass =
    profile.approval_status === "approved"
      ? "bg-[#dff6e6] text-[#176b3a]"
      : profile.approval_status === "rejected"
        ? "bg-[#fde4e4] text-[#a52820]"
        : "bg-[#fff1d6] text-[#8d5b08]";
  const approvalLabel =
    profile.approval_status.charAt(0).toUpperCase() +
    profile.approval_status.slice(1);

  const textField = (
    key: keyof EditableProfile,
    label: string,
    icon: typeof UserRound,
    options: { readOnly?: boolean; type?: string } = {}
  ) => {
    const Icon = icon;
    return (
      <div key={key}>
        <label
          htmlFor={`merchant-${key}`}
          className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]"
        >
          {label}
        </label>
        <div className="relative">
          <Icon
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]"
          />
          <input
            id={`merchant-${key}`}
            type={options.type ?? "text"}
            readOnly={options.readOnly || !isEditing}
            value={form[key] ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, [key]: event.target.value }))
            }
            className={`min-h-11 w-full rounded-xl border border-[#e5eee8] py-2 pl-10 pr-3 text-sm text-[#294237] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15 ${
              isEditing && !options.readOnly ? "bg-white" : "bg-[#f8fbf9]"
            }`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16804c]">
          Account settings
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f2a1d]">
          Your profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b7266]">
          Keep your account and business information current, and manage how
          your team signs in to NexDrop.
        </p>
      </header>

      {profileNotice && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            profileNotice.kind === "success"
              ? "border-[#b8e4c4] bg-[#effaf2] text-[#176b3a]"
              : "border-[#f2c9c5] bg-[#fff4f3] text-[#a52820]"
          }`}
          role={profileNotice.kind === "error" ? "alert" : "status"}
        >
          {profileNotice.message}
        </p>
      )}

      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b3d2a] via-[#0d5037] to-[#126345] p-6 text-white shadow-[0_18px_48px_-28px_rgba(11,61,42,0.8)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border-[36px] border-white/[0.06]" />
        <div aria-hidden="true" className="absolute -bottom-28 right-1/4 -z-10 h-56 w-56 rounded-full bg-[#b6f36b]/[0.08] blur-2xl" />
        <div className="flex flex-row items-start gap-4 sm:items-center sm:gap-6">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-black text-[#d3ff9e] shadow-inner backdrop-blur sm:h-20 sm:w-20 sm:text-2xl"
          >
            {getInitials(profile.business_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65 sm:text-xs">
              Merchant account
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mt-1 break-words text-xl font-bold tracking-tight sm:text-3xl" aria-live="polite">
                {profile.business_name}
              </h2>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white sm:px-3 sm:py-1.5 sm:text-xs">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${profile.approval_status === "approved" ? "bg-[#b6f36b]" : profile.approval_status === "rejected" ? "bg-[#ff9a91]" : "bg-[#ffd27d]"}`} />
                {approvalLabel}
              </span>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75 sm:text-sm">
              <span className="break-words">{profile.full_name}</span>
              <span aria-hidden="true" className="text-white/35">•</span>
              <span>{profile.email}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-5">
              <span className="rounded-lg border border-white/15 bg-black/10 px-2 py-1 text-[10px] text-white/80 sm:px-3 sm:py-1.5 sm:text-xs">
                ID <strong className="ml-1 font-semibold text-white">MER-{String(profile.id).padStart(6, "0")}</strong>
              </span>
              <span className="rounded-lg border border-white/15 bg-black/10 px-2 py-1 text-[10px] text-white/80 sm:px-3 sm:py-1.5 sm:text-xs">
                Member since <strong className="ml-1 font-semibold text-white">{formatDate(profile.joined_date)}</strong>
              </span>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
              <Store aria-hidden="true" className="h-7 w-7 text-[#d3ff9e]" />
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSave}
        aria-label="Profile details"
        className="rounded-3xl border border-[#e5eee8] bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#0f2a1d]">
              Profile details
            </h2>
            <p className="mt-1 text-sm text-[#5b7266]">
              Manage your personal account and registered business information.
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setProfileNotice(null);
                setIsEditing(true);
              }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#cfe3d5] px-4 text-sm font-semibold text-[#0b3d2a] transition-colors hover:bg-[#f2f8f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit profile
            </button>
          )}
        </div>

        <div className="mt-6 grid items-start gap-6 border-t border-[#e5eee8] pt-6 lg:grid-cols-2 lg:gap-8">
          <section aria-labelledby="merchant-account-details-heading">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf6ef] text-[#0b6845]">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h3 id="merchant-account-details-heading" className="font-bold text-[#0f2a1d]">
                  Account details
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-[#6b8176]">
                  Personal and contact information for your account.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {textField("full_name", "Full Name", UserRound)}
              {textField("contact_phone", "Account Phone Number", Phone, { type: "tel" })}
              <div>
                <label htmlFor="merchant-email" className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]" />
                  <input id="merchant-email" readOnly value={profile.email} className="min-h-11 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-3 text-sm text-[#294237] read-only:cursor-default" />
                </div>
              </div>
              <dl className="grid gap-4 border-t border-[#e5eee8] pt-4 sm:grid-cols-2">
                <div>
                  <dt className="mb-1.5 text-xs font-semibold text-[#0f2a1d]">Merchant ID</dt>
                  <dd className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#e5eee8] bg-[#f8fbf9] px-3 text-sm text-[#294237]">
                    <IdCard aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6b8176]" />
                    MER-{String(profile.id).padStart(6, "0")}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1.5 text-xs font-semibold text-[#0f2a1d]">Account Registration Date</dt>
                  <dd className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#e5eee8] bg-[#f8fbf9] px-3 text-sm text-[#294237]">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6b8176]" />
                    {formatDate(profile.joined_date)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section
            aria-labelledby="merchant-business-details-heading"
            className="border-t border-[#e5eee8] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf6ef] text-[#0b6845]">
                <Building2 aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h3 id="merchant-business-details-heading" className="font-bold text-[#0f2a1d]">
                  Business details
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-[#6b8176]">
                  Registered information used for your shipments.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {textField("business_name", "Business Name", Store)}
              <div>
                <label htmlFor="merchant-registration-number" className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]">
                  Registration Number
                </label>
                <div className="relative">
                  <IdCard aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]" />
                  <input id="merchant-registration-number" readOnly value={profile.registration_number} className="min-h-11 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-3 text-sm text-[#294237] read-only:cursor-default" />
                </div>
              </div>
              {textField("business_contact_phone", "Business Phone Number", Phone, { type: "tel" })}
              {textField("business_address", "Business Address", MapPin)}
              {textField("business_type", "Business Type", Building2)}
              {textField("website_url", "Website", Globe, { type: "url" })}
            </div>
          </section>
        </div>

        {isEditing && (
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#e5eee8] pt-5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d6e2da] bg-white px-4 text-sm font-semibold text-[#294237] hover:bg-[#f8fbf9] disabled:opacity-60"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b3d2a] px-4 text-sm font-semibold text-white hover:bg-[#125338] disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Check aria-hidden="true" className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save profile changes"}
            </button>
          </div>
        )}
      </form>

      <section className="w-full min-w-0 rounded-2xl border border-[#e5eee8] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#0b3d2a]">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0f2a1d]">
                  Authentication &amp; Security
                </h2>
                <p className="mt-1 text-sm text-[#5b7266]">
                  Manage your password and protect access to your account.
                </p>
              </div>
            </div>

            <form
              onSubmit={handlePasswordChange}
              className="mt-5"
              aria-labelledby="merchant-change-password-heading"
            >
              {securityNotice && (
                <p
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    securityNotice.kind === "success"
                      ? "border-[#b8e4c4] bg-[#effaf2] text-[#176b3a]"
                      : "border-[#f2c9c5] bg-[#fff4f3] text-[#a52820]"
                  }`}
                  role={securityNotice.kind === "error" ? "alert" : "status"}
                >
                  {securityNotice.message}
                </p>
              )}
              <div>
                <h3 id="merchant-change-password-heading" className="text-sm font-semibold text-[#0f2a1d]">
                  Change Password
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#5b7266]">
                  Use at least 12 characters. Your current password is required to confirm this change.
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {renderPasswordField(
                  "current",
                  "Current Password",
                  "Enter current password",
                  LockKeyhole
                )}
                {renderPasswordField(
                  "new",
                  "New Password",
                  "At least 12 characters",
                  KeyRound
                )}
                {renderPasswordField(
                  "confirm",
                  "Confirm New Password",
                  "Re-enter new password",
                  KeyRound
                )}
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b3d2a] px-4 text-sm font-semibold text-white hover:bg-[#125338] disabled:cursor-wait disabled:opacity-70"
              >
                {isChangingPassword && (
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                )}
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>

            <div className="mt-5 border-t border-[#e5eee8] pt-4">
              <h3 className="text-sm font-semibold text-[#0f2a1d]">Account Status</h3>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#e5eee8] bg-[#f8fbf9] px-3 py-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-[#16804c]" />
                  <p className="text-xs leading-5 text-[#5b7266]">
                    Your business verification status.
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                  {profile.approval_status}
                </span>
              </div>
            </div>
          </section>
    </div>
  );
}
