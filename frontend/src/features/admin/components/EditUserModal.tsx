"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { adminApi, type AdminUserDTO, type AdminUserUpdateDTO } from "@/features/admin/api/admin.api";

export function EditUserModal({ user, onClose, onSaved }: {
  user: AdminUserDTO;
  onClose: () => void;
  onSaved: (user: AdminUserDTO) => void;
}) {
  const [form, setForm] = useState<AdminUserUpdateDTO>({
    full_name: user.name,
    role: user.role.toLowerCase() as AdminUserUpdateDTO["role"],
    vehicle_type: "motorcycle",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const close = () => { if (!saving) onClose(); };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updateUser(user.id, form);
      onSaved(updated);
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save user. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={close} title="Edit User" description={user.email} maxWidth="lg"
      footer={saved ? <Button onClick={close}>Done</Button> : <>
        <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
        <Button type="submit" form="edit-user-form" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </>}>
      {saved ? <p role="status" className="text-foreground">User updated. Role changes take effect when the user signs in again.</p> :
        <form id="edit-user-form" onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <fieldset disabled={saving} className="space-y-4">
            <Input label="Full Name" required minLength={2} maxLength={255} value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminUserUpdateDTO["role"] })}
              options={["Unassigned", "Customer", "Merchant", "Courier", "Dispatcher", "Admin"].map((role) => ({ label: role, value: role.toLowerCase() }))} />
            {form.role === "courier" && user.role !== "Courier" && <>
              <Select label="Vehicle Type" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                options={["motorcycle", "van", "bicycle", "truck"].map((value) => ({ label: value, value }))} />
              <Input label="License Plate" maxLength={50} value={form.license_plate ?? ""} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} />
            </>}
            {form.role === "merchant" && user.role !== "Merchant" && <>
              <Input label="Business Name" required maxLength={255} value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              <Input label="Registration Number" required maxLength={100} value={form.registration_number ?? ""} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
              <Input label="Business Phone" required maxLength={32} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Business Address" required maxLength={255} value={form.business_address ?? ""} onChange={(e) => setForm({ ...form, business_address: e.target.value })} />
            </>}
          </fieldset>
        </form>}
    </Modal>
  );
}
