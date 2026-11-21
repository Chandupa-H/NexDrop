import { cache } from "react";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import apiClient from "@/lib/api-client";
import type { CustomerMeDTO, CustomerAddressDTO } from "./customer.dto";
import { MOCK_CUSTOMER_ME } from "./customer.mock";

/**
 * Server-only customer profile fetcher.
 * Uses createSupabaseServerClient with request cookies to resolve the authenticated customer.
 * Wrapped in React cache() so server layout, page, and topbar share a single request.
 */
export const getCustomerProfile = cache(async (): Promise<CustomerMeDTO> => {
  try {
    await connection();
  } catch {
    // ignore in environments where connection() is unavailable
  }

  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      const {
        data: { session },
      } = await serverClient.auth.getSession();
      const token = session?.access_token;

      const { data: profileRow } = await serverClient
        .from("profiles")
        .select("full_name, email, phone, default_address, city, postal_code")
        .eq("id", user.id)
        .maybeSingle();

      const meta = user.user_metadata || {};
      const metaName = (meta.full_name as string) || (meta.name as string);
      const emailPrefix = user.email
        ? user.email.split("@")[0].replace(/[._]/g, " ")
        : "";
      const formattedEmailName = emailPrefix
        ? emailPrefix
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Customer";

      const fullName = profileRow?.full_name || metaName || formattedEmailName;
      const email = user.email || profileRow?.email || "";
      let backendMe: CustomerMeDTO | null = null;
      if (
        token &&
        ((!profileRow?.default_address && !meta.default_address) ||
          (!profileRow?.phone && !meta.phone))
      ) {
        try {
          backendMe = await apiClient.get<CustomerMeDTO>("/customers/customer/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // backend offline or unreachable
        }
      }

      const phone =
        profileRow?.phone ||
        (meta.phone as string) ||
        (backendMe?.phone ? backendMe.phone : "") ||
        user.phone ||
        "";

      const defaultAddress =
        profileRow?.default_address ||
        (meta.default_address as string) ||
        (backendMe?.default_address && backendMe.default_address !== "45/2 Temple Road"
          ? backendMe.default_address
          : "") ||
        "";
      const city =
        profileRow?.city ||
        (meta.city as string) ||
        (backendMe?.city && backendMe.city !== "Colombo 07"
          ? backendMe.city
          : "") ||
        "";
      const postalCode =
        profileRow?.postal_code ||
        (meta.postal_code as string) ||
        (backendMe?.postal_code && backendMe.postal_code !== "00700"
          ? backendMe.postal_code
          : "") ||
        "";

      return {
        id: 1,
        full_name: fullName,
        email: email,
        phone: phone,
        role: "customer",
        default_address: defaultAddress,
        city: city,
        postal_code: postalCode,
      };
    }
  } catch (err) {
    console.warn("[CustomerAPI] Could not resolve Supabase user session on server:", err);
  }

  // Fallback to backend /customers/customer/me or mock
  try {
    const backendMe = await apiClient.get<CustomerMeDTO>("/customers/customer/me");
    if (backendMe) {
      return {
        ...backendMe,
        default_address: backendMe.default_address === "45/2 Temple Road" ? "" : backendMe.default_address,
        city: backendMe.city === "Colombo 07" ? "" : backendMe.city,
        postal_code: backendMe.postal_code === "00700" ? "" : backendMe.postal_code,
        phone:
          backendMe.phone === "+94771234567" || backendMe.phone === "+94 77 123 4567"
            ? ""
            : backendMe.phone,
        full_name: backendMe.full_name === "Dihini Kankanamage" ? "" : backendMe.full_name,
      };
    }
  } catch (err) {
    console.warn("[CustomerAPI] Backend unreachable, falling back to mock profile:", err);
  }
  return MOCK_CUSTOMER_ME;
});

/**
 * Server-only customer saved addresses fetcher.
 * Attaches the authenticated customer's session token to query their real addresses.
 */
export const getCustomerAddressesServer = cache(async (type?: "pickup" | "dropoff"): Promise<CustomerAddressDTO[]> => {
  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { session },
    } = await serverClient.auth.getSession();
    const token = session?.access_token;
    if (!token) return [];

    const query = type ? `?type=${type}` : "";
    const list = await apiClient.get<CustomerAddressDTO[]>(`/customers/customer/addresses${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (Array.isArray(list)) {
      return list.filter(
        (a) =>
          !(a.address === "45/2 Temple Road" && a.city === "Colombo 07" && a.postal_code === "00700" && !session?.user?.email)
      );
    }
    return [];
  } catch (err) {
    console.warn("[CustomerServer] Could not fetch server addresses:", err);
    return [];
  }
});
