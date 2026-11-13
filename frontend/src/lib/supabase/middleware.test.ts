import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));
beforeEach(() => vi.clearAllMocks());

it.each([
  ["admin", "/admin/dashboard"], ["courier", "/courier/dashboard"],
  ["dispatcher", "/dispatcher/dashboard"], ["merchant", "/merchant"], ["customer", "/"],
])("redirects a direct registration visit for %s", async (role, destination) => {
  getUser.mockResolvedValue({ data: { user: { id: "u1", app_metadata: { role } } } });
  const response = await updateSession(new NextRequest("http://localhost/register?source=login"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`http://localhost${destination}`);
});

it("allows an unassigned user to register", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "u1", app_metadata: { role: "unassigned" } } } });
  const response = await updateSession(new NextRequest("http://localhost/register"));
  expect(response.headers.get("location")).toBeNull();
});

it("allows an anonymous user to view registration", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const response = await updateSession(new NextRequest("http://localhost/register"));
  expect(response.headers.get("location")).toBeNull();
});

it("ignores a login returnTo pointing at registration for assigned users", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "u1", app_metadata: { role: "courier" } } } });
  const response = await updateSession(new NextRequest("http://localhost/login?returnTo=%2Fregister"));
  expect(response.headers.get("location")).toBe("http://localhost/courier/dashboard");
});
