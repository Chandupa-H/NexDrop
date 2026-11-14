import apiClient from "@/lib/api-client";
import type {
  MerchantPasswordChangeDTO,
  MerchantProfileDTO,
  MerchantProfileUpdateDTO,
} from "../types";

export function getMerchantAccountProfile(): Promise<MerchantProfileDTO> {
  return apiClient.get<MerchantProfileDTO>("/merchants/me/profile");
}

export function updateMerchantAccountProfile(
  profile: MerchantProfileUpdateDTO
): Promise<MerchantProfileDTO> {
  return apiClient.patch<MerchantProfileDTO>("/merchants/me/profile", profile);
}

export function changeMerchantPassword(
  password: MerchantPasswordChangeDTO
): Promise<void> {
  return apiClient.post<void>(
    "/merchants/me/profile/change-password",
    password
  );
}
