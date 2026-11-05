"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileImage, LoaderCircle, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import apiClient, { ApiError } from "@/lib/api-client";

type Values = Record<string, string>;
type DocumentKey = "nic_front" | "nic_back" | "licence_front" | "licence_back" | "vehicle_registration" | "profile_photo";
type DocumentSpec = { key: DocumentKey; label: string; hint: string; required: boolean; imageOnly?: boolean };

const STEPS = ["Personal & account", "Contact & emergency", "Vehicle", "Documents", "Review"];
const DOCUMENTS: DocumentSpec[] = [
  { key: "profile_photo", label: "Profile photo", hint: "A clear, recent face photo", required: true, imageOnly: true },
  { key: "nic_front", label: "NIC front", hint: "Front side of your National Identity Card", required: true },
  { key: "nic_back", label: "NIC back", hint: "Back side of your National Identity Card", required: true },
  { key: "licence_front", label: "Driving licence front", hint: "Front side of your valid driving licence", required: true },
  { key: "licence_back", label: "Driving licence back", hint: "Optional, if your licence has information on the reverse", required: false },
  { key: "vehicle_registration", label: "Vehicle registration certificate", hint: "Your vehicle registration document", required: true },
];
const DISTRICTS = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];
const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle" }, { value: "scooter", label: "Scooter" },
  { value: "three_wheeler", label: "Three-wheeler" }, { value: "car", label: "Car" }, { value: "van", label: "Van" },
];
const emptyValues: Values = {
  full_name: "", email: "", date_of_birth: "", gender: "", nic_number: "", nationality: "Sri Lankan",
  password: "", confirm_password: "", phone: "", alternative_phone: "", residential_address: "", city: "", district: "", postal_code: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  vehicle_type: "", license_plate: "", vehicle_brand: "", vehicle_model: "", vehicle_color: "", vehicle_year: "", driving_licence_number: "", driving_licence_expiry: "",
};

const mobilePattern = /^(?:0?7\d{8}|\+94\s?7\d{8})$/;
const nicPattern = /^(?:\d{9}[vVxX]|\d{12})$/;

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="text-xl font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

export default function CourierRegisterPage() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [files, setFiles] = useState<Partial<Record<DocumentKey, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<DocumentKey, string>>>({});
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocumentKey, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, accurate: false });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serverError, setServerError] = useState("");
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((preview) => { if (preview) URL.revokeObjectURL(preview); });
  }, []);

  const passwordScore = useMemo(() => [values.password.length >= 10, /[A-Z]/.test(values.password), /[a-z]/.test(values.password), /\d/.test(values.password), /[^A-Za-z0-9]/.test(values.password)].filter(Boolean).length, [values.password]);
  const update = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setServerError("");
  };

  const input = (key: string, label: string, type = "text", extra: { placeholder?: string; helperText?: string; autoComplete?: string; required?: boolean; min?: string; max?: string } = {}) => (
    <Input id={key} key={key} label={label} type={type} value={values[key] ?? ""} onChange={(event) => update(key, event.target.value)} error={errors[key]} required={extra.required ?? true} placeholder={extra.placeholder} helperText={extra.helperText} autoComplete={extra.autoComplete} min={extra.min} max={extra.max} />
  );
  const select = (key: string, label: string, options: { value: string; label: string }[], placeholder = "Choose an option") => (
    <Select id={key} key={key} label={label} value={values[key] ?? ""} onChange={(event) => update(key, event.target.value)} options={options} placeholder={placeholder} error={errors[key]} required />
  );
  const textArea = (key: string, label: string, placeholder: string) => (
    <Textarea id={key} key={key} label={label} value={values[key] ?? ""} onChange={(event) => update(key, event.target.value)} rows={3} placeholder={placeholder} error={errors[key]} required />
  );

  const validateStep = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    const requiredByStep: Record<number, string[]> = {
      0: ["full_name", "email", "date_of_birth", "gender", "nic_number", "nationality", "password", "confirm_password"],
      1: ["phone", "residential_address", "city", "district", "emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone"],
      2: ["vehicle_type", "license_plate", "vehicle_brand", "vehicle_model", "vehicle_color", "vehicle_year", "driving_licence_number", "driving_licence_expiry"],
    };
    for (const field of requiredByStep[targetStep] ?? []) if (!values[field]?.trim()) nextErrors[field] = "This field is required.";
    if (targetStep === 0) {
      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "Enter a valid email address.";
      if (values.nic_number && !nicPattern.test(values.nic_number.replace(/\s/g, ""))) nextErrors.nic_number = "Use 9 digits plus V/X, or 12 digits.";
      if (values.date_of_birth) {
        const birth = new Date(`${values.date_of_birth}T00:00:00`);
        const age = new Date().getFullYear() - birth.getFullYear() - (new Date().getMonth() < birth.getMonth() || (new Date().getMonth() === birth.getMonth() && new Date().getDate() < birth.getDate()) ? 1 : 0);
        if (Number.isNaN(birth.getTime()) || age < 18) nextErrors.date_of_birth = "You must be at least 18 years old.";
      }
      if (values.password && (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(values.password) || values.password.length < 10)) nextErrors.password = "Use 10+ characters with uppercase, lowercase, a number, and a symbol.";
      if (values.confirm_password && values.password !== values.confirm_password) nextErrors.confirm_password = "Passwords do not match.";
    }
    if (targetStep === 1) {
      for (const field of ["phone", "emergency_contact_phone", ...(values.alternative_phone ? ["alternative_phone"] : [])]) {
        if (values[field] && !mobilePattern.test(values[field].replace(/[()-]/g, "").replace(/\s/g, ""))) nextErrors[field] = "Enter a valid Sri Lankan mobile number.";
      }
    }
    if (targetStep === 2) {
      const year = Number(values.vehicle_year);
      if (values.vehicle_year && (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1)) nextErrors.vehicle_year = "Enter a valid vehicle year.";
      if (values.driving_licence_expiry && new Date(values.driving_licence_expiry) <= new Date(new Date().toDateString())) nextErrors.driving_licence_expiry = "Your driving licence must not be expired.";
    }
    if (targetStep === 3) {
      for (const spec of DOCUMENTS) if (spec.required && !files[spec.key]) setFileErrors((current) => ({ ...current, [spec.key]: "Please upload this document." }));
      if (DOCUMENTS.some((spec) => spec.required && !files[spec.key])) return false;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFile = (key: DocumentKey, imageOnly: boolean, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = imageOnly ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setFileErrors((current) => ({ ...current, [key]: imageOnly ? "Choose a JPG, PNG, or WebP image." : "Choose a JPG, PNG, WebP, or PDF file." }));
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileErrors((current) => ({ ...current, [key]: "File must be 5 MB or smaller." }));
      event.target.value = "";
      return;
    }
    setFiles((current) => ({ ...current, [key]: file }));
    if (previews[key]) URL.revokeObjectURL(previews[key]!);
    setPreviews((current) => ({ ...current, [key]: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }));
    setFileErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async () => {
    setServerError("");
    if (!agreements.terms || !agreements.privacy || !agreements.accurate) {
      setServerError("Please accept the terms, privacy policy, and accuracy confirmation before submitting.");
      return;
    }
    const body = new FormData();
    Object.entries(values).forEach(([key, value]) => body.append(key, value));
    body.append("agree_terms", "true");
    body.append("agree_privacy", "true");
    body.append("confirm_accuracy", "true");
    for (const [key, file] of Object.entries(files)) if (file) body.append(key, file);
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const response = await apiClient.registerCourier(body, (loaded, total) => setUploadProgress(Math.min(100, Math.round((loaded / total) * 100))));
      setSubmittedId(response.courier_id);
      setStep(STEPS.length);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "We could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const setAgreement = (key: keyof typeof agreements) => (event: ChangeEvent<HTMLInputElement>) => setAgreements((current) => ({ ...current, [key]: event.target.checked }));
  const fieldGrid = (...fields: ReactNode[]) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields}</div>;

  const renderDocuments = () => (
    <div className="space-y-4">
      {DOCUMENTS.map((spec) => {
        const file = files[spec.key];
        const preview = previews[spec.key];
        return <div key={spec.key} className={`rounded-xl border p-4 ${fileErrors[spec.key] ? "border-destructive" : "border-border"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-primary">{preview ? <Image src={preview} alt={`${spec.label} preview`} width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover" /> : file ? <FileCheck2 className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{spec.label}{spec.required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</p><p className="text-xs text-muted-foreground">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : spec.hint}</p>{fileErrors[spec.key] && <p role="alert" className="mt-1 text-xs text-destructive">{fileErrors[spec.key]}</p>}</div>
            {file ? <div className="flex gap-2"><label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-primary hover:bg-muted focus-within:ring-2 focus-within:ring-primary"><UploadCloud className="h-4 w-4" /> Replace<input className="sr-only" type="file" accept={spec.imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={(event) => handleFile(spec.key, Boolean(spec.imageOnly), event)} aria-label={`Replace ${spec.label}`} /></label><Button type="button" variant="outline" size="sm" onClick={() => { if (previews[spec.key]) URL.revokeObjectURL(previews[spec.key]!); setPreviews((current) => ({ ...current, [spec.key]: undefined })); setFiles((current) => ({ ...current, [spec.key]: undefined })); setFileErrors((current) => ({ ...current, [spec.key]: spec.required ? "Please upload this document." : "" })); }} aria-label={`Remove ${spec.label}`}><Trash2 className="h-4 w-4" /> Remove</Button></div> : <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-primary hover:bg-muted focus-within:ring-2 focus-within:ring-primary"><UploadCloud className="h-4 w-4" /> Choose file<input className="sr-only" type="file" accept={spec.imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={(event) => handleFile(spec.key, Boolean(spec.imageOnly), event)} aria-label={`Upload ${spec.label}`} /></label>}
          </div>
        </div>;
      })}
      <p className="text-xs text-muted-foreground">Files are limited to 5 MB each. Identity and vehicle documents are stored privately for application review.</p>
    </div>
  );

  const reviewRows = [
    ["Name", values.full_name], ["Email", values.email], ["Date of birth", values.date_of_birth], ["Gender", values.gender.replaceAll("_", " ")],
    ["NIC", values.nic_number ? `••••••${values.nic_number.slice(-4)}` : ""], ["Nationality", values.nationality], ["Mobile", values.phone],
    ["Alternative phone", values.alternative_phone], ["Address", `${values.residential_address}, ${values.city}, ${values.district}${values.postal_code ? ` ${values.postal_code}` : ""}`],
    ["Emergency contact", `${values.emergency_contact_name} · ${values.emergency_contact_relationship} · ${values.emergency_contact_phone}`],
    ["Vehicle", `${VEHICLE_TYPES.find((item) => item.value === values.vehicle_type)?.label ?? values.vehicle_type} · ${values.vehicle_brand} ${values.vehicle_model} · ${values.vehicle_year}`],
    ["Registration", values.license_plate], ["Driving licence", `${values.driving_licence_number} · expires ${values.driving_licence_expiry}`],
  ];

  let content: ReactNode = null;
  if (step === 0) content = <>
    <SectionHeading title="Personal information" description="Tell us who you are. Your identity details are used for courier verification." />
    <div className="space-y-4">{fieldGrid(input("full_name", "Full name", "text", { autoComplete: "name", placeholder: "Your legal name" }), input("email", "Email address", "email", { autoComplete: "email", placeholder: "you@example.com" }))}
      {fieldGrid(input("date_of_birth", "Date of birth", "date"), select("gender", "Gender", [{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "non_binary", label: "Non-binary" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]))}
      {fieldGrid(input("nic_number", "NIC number", "text", { placeholder: "123456789V or 200012345678", helperText: "Old format: 9 digits and V/X. New format: 12 digits." }), input("nationality", "Nationality", "text", { autoComplete: "country-name" }))}
      <div className="relative"><Input id="password" label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={values.password} onChange={(event) => update("password", event.target.value)} error={errors.password} required helperText="At least 10 characters with uppercase, lowercase, number, and symbol." /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-9 text-xs font-semibold text-primary underline">{showPassword ? "Hide" : "Show"}</button></div>
      <div><div className="mb-1 flex gap-1" aria-label={`Password strength ${passwordScore} of 5`}>{[1, 2, 3, 4, 5].map((mark) => <span key={mark} className={`h-1.5 flex-1 rounded-full ${passwordScore >= mark ? passwordScore < 3 ? "bg-amber-500" : passwordScore < 5 ? "bg-brand-green" : "bg-primary" : "bg-muted"}`} />)}</div><p className="text-xs text-muted-foreground">Password strength: {passwordScore < 3 ? "Needs work" : passwordScore < 5 ? "Good" : "Strong"}</p></div>
      {input("confirm_password", "Confirm password", showPassword ? "text" : "password", { autoComplete: "new-password" })}</div>
  </>;
  if (step === 1) content = <>
    <SectionHeading title="Contact & emergency details" description="Add a reliable way for our operations team to reach you." />
    <div className="space-y-4">{fieldGrid(input("phone", "Mobile number", "tel", { autoComplete: "tel", placeholder: "+94 77 123 4567", helperText: "Sri Lankan mobile number" }), input("alternative_phone", "Alternative phone (optional)", "tel", { placeholder: "+94 77 123 4567", required: false }))}
      {textArea("residential_address", "Residential address", "House number, street, and area")}
      {fieldGrid(input("city", "City", "text", { autoComplete: "address-level2" }), select("district", "District", DISTRICTS.map((district) => ({ value: district, label: district }))))}
      {input("postal_code", "Postal code (optional)", "text", { required: false, autoComplete: "postal-code" })}
      <div className="border-t border-border pt-5"><h3 className="mb-4 text-sm font-semibold text-primary">Emergency contact</h3><div className="space-y-4">{fieldGrid(input("emergency_contact_name", "Full name"), input("emergency_contact_relationship", "Relationship", "text", { placeholder: "e.g. Parent, spouse" }))}{input("emergency_contact_phone", "Contact number", "tel", { placeholder: "+94 77 123 4567" })}</div></div>
    </div>
  </>;
  if (step === 2) content = <>
    <SectionHeading title="Vehicle information" description="Provide the vehicle and licence details you will use for deliveries." />
    <div className="space-y-4">{fieldGrid(select("vehicle_type", "Vehicle type", VEHICLE_TYPES), input("license_plate", "Vehicle registration number", "text", { placeholder: "ABC-1234" }))}
      {fieldGrid(input("vehicle_brand", "Vehicle brand", "text", { placeholder: "Honda" }), input("vehicle_model", "Vehicle model", "text", { placeholder: "Dio" }))}
      {fieldGrid(input("vehicle_color", "Vehicle color"), input("vehicle_year", "Vehicle year", "number", { min: "1980", placeholder: "2022" }))}
      {fieldGrid(input("driving_licence_number", "Driving licence number"), input("driving_licence_expiry", "Licence expiry date", "date"))}</div>
  </>;
  if (step === 3) content = <><SectionHeading title="Required documents" description="Upload clear, readable copies. Images and PDFs are accepted up to 5 MB each." />{renderDocuments()}</>;
  if (step === 4) content = <>
    <SectionHeading title="Review your application" description="Check these details before you send your application for review." />
    <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">{reviewRows.map(([label, value]) => <div key={label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"><span className="text-xs font-medium text-muted-foreground">{label}</span><span className="break-words text-sm">{value || "—"}</span></div>)}
      {DOCUMENTS.map((spec) => <div key={spec.key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"><span className="text-xs font-medium text-muted-foreground">{spec.label}</span><span className="break-words text-sm">{files[spec.key]?.name ?? "Not provided"}</span></div>)}
    </div>
    <div className="mt-5 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={agreements.terms} onChange={setAgreement("terms")} /><span>I agree to the <Link className="font-semibold text-primary underline" href="/terms" target="_blank">Terms and Conditions</Link>.</span></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={agreements.privacy} onChange={setAgreement("privacy")} /><span>I agree to the <Link className="font-semibold text-primary underline" href="/privacy" target="_blank">Privacy Policy</Link>.</span></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={agreements.accurate} onChange={setAgreement("accurate")} /><span>I confirm the information and documents I provided are accurate.</span></label>
    </div>
    <div className="mt-4 flex gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Your account will remain inactive and your application will be marked <strong>Pending</strong> until an authorized team member completes verification.</p></div>
  </>;

  if (step === STEPS.length) return <div className="mx-auto max-w-2xl py-8"><Card><CardContent className="px-6 py-10 text-center sm:px-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-700"><CheckCircle2 className="h-9 w-9" /></div><h1 className="mt-5 text-2xl font-bold text-primary">Application submitted</h1><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your courier application is now pending verification. We will review your details and documents before activating your account.</p><div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"><span className="text-muted-foreground">Reference</span><strong className="font-mono text-primary">COU-{String(submittedId ?? 0).padStart(6, "0")}</strong></div><p className="mt-5 text-sm text-muted-foreground">Your login remains inactive until the application is approved.</p><Link href="/" className="mt-6 inline-flex"><Button variant="outline">Return home</Button></Link></CardContent></Card></div>;

  return <div className="mx-auto max-w-3xl">
    <div className="mb-7 text-center"><div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"><Check className="h-3.5 w-3.5" /> Courier opportunities in your area</div><h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Become a NexDrop courier</h1><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Complete your application to join our delivery network. Your information is reviewed securely before approval.</p></div>
    <div className="mb-5" aria-label={`Step ${step + 1} of ${STEPS.length}`}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-primary">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span><span className="text-muted-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand-green transition-[width]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div><ol className="mt-3 hidden grid-cols-5 gap-2 sm:grid">{STEPS.map((label, index) => <li key={label} className={`text-center text-[11px] ${index <= step ? "font-medium text-primary" : "text-muted-foreground"}`} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol></div>
    <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-white px-5 py-4 sm:px-7"><CardTitle className="text-base">{STEPS[step]}</CardTitle><CardDescription>{step === 4 ? "Confirm the information and submit for verification." : "Your progress is kept while you move between sections."}</CardDescription></CardHeader><CardContent className="px-5 py-6 sm:px-7 sm:py-7">{content}
      {serverError && <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{serverError}</div>}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">{step > 0 ? <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={submitting}><ArrowLeft className="h-4 w-4" /> Previous</Button> : <span />}{step < 4 ? <Button type="button" onClick={() => { if (validateStep(step)) setStep((current) => current + 1); }} className="w-full sm:w-auto">Continue <ArrowRight className="h-4 w-4" /></Button> : <Button type="button" onClick={submit} disabled={submitting || !agreements.terms || !agreements.privacy || !agreements.accurate} className="w-full sm:w-auto">{submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Submitting securely…</> : <><UploadCloud className="h-4 w-4" /> Submit application</>}</Button>}</div>
      {submitting && <div className="mt-3 space-y-1"><div className="flex justify-between text-xs text-muted-foreground"><span role="status">Uploading your documents securely. Please keep this page open.</span><span>{uploadProgress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div role="progressbar" aria-label="Document upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} className="h-full rounded-full bg-brand-green transition-[width]" style={{ width: `${uploadProgress}%` }} /></div></div>}
    </CardContent></Card>
    <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Personal information and verification files are handled securely.</p>
  </div>;
}
