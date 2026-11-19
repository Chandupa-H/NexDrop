import { redirect } from "next/navigation";

export const metadata = {
  title: "Merchant Sign In — NexDrop",
  description: "Sign in to your NexDrop merchant portal.",
};

export default function MerchantLoginPage() {
  redirect("/login?redirect=/merchant/dashboard");
}

