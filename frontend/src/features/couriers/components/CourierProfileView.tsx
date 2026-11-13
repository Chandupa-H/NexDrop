"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api-client";
import {
  changeCourierPassword,
  getCourierAccountProfile,
  updateCourierAccountProfile,
} from "../api/courier.api";
import type {
  CourierProfileDTO,
  CourierProfileUpdateDTO,
} from "../api/courier.dto";

type Notice = { kind: "success" | "error"; message: string };
type EditableProfile = Pick<CourierProfileDTO, "full_name" | "contact_phone">;
type PasswordField = "current" | "new" | "confirm";

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
  const name = values.full_name.trim();
  if (name.length < 2 || name.length > 255) {
    return "Full name must be between 2 and 255 characters.";
  }
  const phone = values.contact_phone.trim();
  if (!/^\+?[0-9][0-9\s()-]*$/.test(phone)) {
    return "Enter a valid contact phone number.";
  }
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) {
    return "Phone number must contain 7 to 15 digits.";
  }
  return null;
}

function AccountValue({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="mb-1.5 text-xs font-semibold text-[#0f2a1d]">{label}</dt>
      <dd className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#e5eee8] bg-[#f8fbf9] px-3 text-sm text-[#294237]">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6b8176]" />
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}

function CourierProfileLoading() {
  return (
    <div className="space-y-6" aria-label="Loading profile" aria-busy="true">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-[#e5eee8]" />
      <div className="h-36 animate-pulse rounded-2xl bg-[#dcebe1]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
      <span className="sr-only">Loading your courier profile.</span>
    </div>
  );
}

export function CourierProfileView() {
  const [profile, setProfile] = useState<CourierProfileDTO | null>(null);
  const [form, setForm] = useState<EditableProfile>({
    full_name: "",
    contact_phone: "",
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
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getCourierAccountProfile();
      setProfile(result);
      setForm({
        full_name: result.full_name,
        contact_phone: result.contact_phone,
      });
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void getCourierAccountProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm({
          full_name: result.full_name,
          contact_phone: result.contact_phone,
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

  const handleCancel = () => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        contact_phone: profile.contact_phone,
      });
    }
    setIsEditing(false);
    setNotice(null);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProfile(form);
    if (validationError) {
      setNotice({ kind: "error", message: validationError });
      return;
    }

    setIsSaving(true);
    setNotice(null);
    try {
      const updatedProfile = await updateCourierAccountProfile({
        full_name: form.full_name.trim(),
        contact_phone: form.contact_phone.trim(),
      } satisfies CourierProfileUpdateDTO);
      setProfile(updatedProfile);
      setForm({
        full_name: updatedProfile.full_name,
        contact_phone: updatedProfile.contact_phone,
      });
      setIsEditing(false);
      setNotice({ kind: "success", message: "Your profile was updated." });
    } catch (error) {
      setNotice({ kind: "error", message: getApiErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (passwords.new.length < 12) {
      setNotice({
        kind: "error",
        message: "New password must be at least 12 characters.",
      });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setNotice({
        kind: "error",
        message: "Password confirmation does not match.",
      });
      return;
    }

    setNotice(null);
    setIsChangingPassword(true);
    try {
      await changeCourierPassword({
        current_password: passwords.current,
        new_password: passwords.new,
        confirm_password: passwords.confirm,
      });
      setPasswords({ current: "", new: "", confirm: "" });
      setNotice({ kind: "success", message: "Your password was updated." });
    } catch (error) {
      setNotice({ kind: "error", message: getApiErrorMessage(error) });
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
    <div>
      <label
        htmlFor={`courier-password-${field}`}
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
          id={`courier-password-${field}`}
          type={visiblePasswords[field] ? "text" : "password"}
          autoComplete={
            field === "current" ? "current-password" : "new-password"
          }
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
          className="min-h-10 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-11 text-sm text-[#294237] outline-none placeholder:text-[#8b9b92] focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15"
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

  if (isLoading) return <CourierProfileLoading />;

  if (loadError || !profile) {
    return (
      <section
        className="rounded-2xl border border-[#f2c9c5] bg-white p-6"
        role="alert"
      >
        <h1 className="text-xl font-bold text-[#0f2a1d]">
          Couldn&apos;t load your profile
        </h1>
        <p className="mt-2 text-sm text-[#5b7266]">
          {loadError ?? "Your courier profile is unavailable right now."}
        </p>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="mt-4 rounded-lg bg-[#0b3d2a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125338] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]"
        >
          Try again
        </button>
      </section>
    );
  }

  const statusClass =
    profile.status === "ACTIVE"
      ? "bg-[#dff6e6] text-[#176b3a]"
      : profile.status === "SUSPENDED"
        ? "bg-[#fde4e4] text-[#a52820]"
        : "bg-[#fff1d6] text-[#8d5b08]";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f2a1d]">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-[#5b7266]">
          Manage your courier contact information and account security.
        </p>
      </header>

      {notice && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-[#b8e4c4] bg-[#effaf2] text-[#176b3a]"
              : "border-[#f2c9c5] bg-[#fff4f3] text-[#a52820]"
          }`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      )}

      <section className="rounded-2xl bg-gradient-to-r from-[#0b3d2a] to-[#08422d] p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#b6f36b] text-2xl font-black text-[#0b3d2a] shadow-inner"
          >
            {getInitials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold" aria-live="polite">
                {profile.full_name}
              </h2>
              <span className="rounded-full bg-[#b6f36b] px-3 py-1 text-xs font-semibold text-[#0b3d2a]">
                Courier
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
              >
                {profile.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/75">
              <span>
                Courier ID:{" "}
                <strong className="text-white">COU-{profile.id}</strong>
              </span>
              <span>
                Joined:{" "}
                <strong className="text-white">
                  {formatDate(profile.joined_date)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <section className="w-full min-w-0 rounded-2xl border border-[#e5eee8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f2a1d]">
                Account Details
              </h2>
              <p className="mt-1 text-sm text-[#5b7266]">
                Update your contact info and courier display identity.
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setIsEditing(true);
                }}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[#cfe3d5] px-3 text-sm font-semibold text-[#0b3d2a] hover:bg-[#f2f8f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16a34a]"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="courier-full-name"
                className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]"
              >
                Full Legal Name
              </label>
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]"
                />
                <input
                  id="courier-full-name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={255}
                  readOnly={!isEditing || isSaving}
                  value={isEditing ? form.full_name : profile.full_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-3 text-sm text-[#294237] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15 read-only:cursor-default"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="courier-email"
                className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]"
                />
                <input
                  id="courier-email"
                  type="email"
                  readOnly
                  value={profile.email}
                  className="min-h-11 w-full cursor-default rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-3 text-sm text-[#294237] outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="courier-phone"
                className="mb-1.5 block text-xs font-semibold text-[#0f2a1d]"
              >
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b8176]"
                />
                <input
                  id="courier-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  readOnly={!isEditing || isSaving}
                  value={isEditing ? form.contact_phone : profile.contact_phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contact_phone: event.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-[#e5eee8] bg-[#f8fbf9] py-2 pl-10 pr-3 text-sm text-[#294237] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15 read-only:cursor-default"
                />
              </div>
            </div>

            <dl className="grid gap-4 border-t border-[#e5eee8] pt-4 sm:grid-cols-2">
              <AccountValue
                icon={IdCard}
                label="Courier ID"
                value={`COU-${profile.id}`}
              />
              <AccountValue
                icon={CalendarDays}
                label="Account Registration Date"
                value={formatDate(profile.joined_date)}
              />
              <div>
                <dt className="mb-1.5 text-xs font-semibold text-[#0f2a1d]">
                  Account Status
                </dt>
                <dd>
                  <span
                    className={`inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold ${statusClass}`}
                  >
                    {profile.status}
                  </span>
                </dd>
              </div>
            </dl>

            {isEditing && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#e5eee8] pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d6e2da] px-4 text-sm font-semibold text-[#294237] hover:bg-[#f8fbf9] disabled:opacity-60"
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
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </section>

        <div className="w-full min-w-0 space-y-6">
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
                  Multi-factor authentication and session controls.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#b8ebd3] bg-[#f0fbf6] p-3">
              <div className="flex items-center gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#16804c]"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#0f2a1d]">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5b7266]">
                    Status is unavailable for courier accounts.
                  </p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border border-[#cfe3d5] bg-white px-3 py-1 text-xs font-semibold text-[#5b7266]">
                  Unavailable
                </span>
              </div>
            </div>

            <form
              onSubmit={handlePasswordChange}
              className="mt-4 space-y-2"
              aria-labelledby="change-password-heading"
            >
              <h3
                id="change-password-heading"
                className="text-sm font-semibold text-[#0f2a1d]"
              >
                Change Password
              </h3>
              {renderPasswordField(
                "current",
                "Current Password",
                "Current password",
                LockKeyhole
              )}
              {renderPasswordField(
                "new",
                "New Password",
                "New password (minimum 12 characters)",
                KeyRound
              )}
              {renderPasswordField(
                "confirm",
                "Confirm New Password",
                "Confirm new password",
                KeyRound
              )}
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b3d2a] px-4 text-sm font-semibold text-white hover:bg-[#125338] disabled:cursor-wait disabled:opacity-70"
              >
                {isChangingPassword && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[#0f2a1d]">
                Active Courier Sessions
              </h3>
              <div className="mt-2 rounded-xl border border-[#e5eee8] bg-[#f8fbf9] px-3 py-2">
                <p className="text-xs leading-5 text-[#5b7266]">
                  Courier session listing and revocation are not available yet.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
