import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { EditUserModal } from "./EditUserModal";
import { adminApi, type AdminUserDTO } from "../api/admin.api";

vi.mock("../api/admin.api", () => ({ adminApi: { updateUser: vi.fn() } }));
const user: AdminUserDTO = { id: 8, display_id: "USR-00008", name: "Test User", email: "test@example.com", phone: null, role: "Unassigned", status: "Active", is_active: true, joined: "Today", created_at: "2026-11-14", deliveries: 0 };
beforeEach(() => vi.clearAllMocks());

it("assigns a role and updates the directory after saving", async () => {
  const updated = { ...user, role: "Courier" };
  vi.mocked(adminApi.updateUser).mockResolvedValue(updated);
  const onSaved = vi.fn();
  render(<EditUserModal user={user} onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "courier" } });
  expect(screen.getByLabelText("Vehicle Type")).toBeInTheDocument();
  fireEvent.submit(document.getElementById("edit-user-form")!);
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  expect(adminApi.updateUser).toHaveBeenCalledWith(8, expect.objectContaining({ role: "courier" }));
  expect(screen.getByRole("status")).toHaveTextContent("User updated");
});

it("keeps the form open and shows a failed save", async () => {
  vi.mocked(adminApi.updateUser).mockRejectedValue(new Error("Supabase unavailable"));
  const onSaved = vi.fn();
  render(<EditUserModal user={user} onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.submit(document.getElementById("edit-user-form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Supabase unavailable");
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
});
