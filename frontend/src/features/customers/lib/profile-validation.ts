import { ApiError } from "@/lib/api-client";

export const profileFields = {
  full_name: { label: "Full name", min: 2, max: 150 },
  phone: { label: "Contact number", min: 7, max: 30 },
  default_address: { label: "Street address", min: 3, max: 255 },
  city: { label: "City", min: 2, max: 100 },
  postal_code: { label: "Postal code", min: 3, max: 20 },
} as const;
export type ProfileField = keyof typeof profileFields;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;
export const ACCOUNT_UNAVAILABLE = "Customer account verification is unavailable. Editing is disabled until Platform identity integration is ready. No changes have been confirmed.";

export function validateProfile(values: Record<ProfileField, string>): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  for (const field of Object.keys(profileFields) as ProfileField[]) {
    const { label, min, max } = profileFields[field];
    const length = values[field].trim().length;
    if (length < min || length > max) errors[field] = `${label} must contain ${min}–${max} characters.`;
  }
  return errors;
}

export function profileRequestError(error: unknown): { message: string; unavailable: boolean; fields: ProfileFieldErrors } {
  const fields: ProfileFieldErrors = {};
  if (error instanceof ApiError) {
    if (error.status === 503) return { message: ACCOUNT_UNAVAILABLE, unavailable: true, fields };
    if (error.status === 401 || error.status === 403) return { message: "Your account could not be verified for this operation. No changes have been confirmed.", unavailable: true, fields };
    if (error.status === 422 && Array.isArray(error.data.detail)) {
      for (const detail of error.data.detail) {
        const field = detail.loc.at(-1);
        if (field && Object.hasOwn(profileFields, field)) fields[field as ProfileField] = detail.msg;
      }
    }
  }
  return { message: "The profile request could not be confirmed. Please try again. Your entered values have been kept.", unavailable: false, fields };
}
