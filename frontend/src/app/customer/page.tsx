import { redirect } from "next/navigation";

/**
 * /customer → redirect to /customer/dashboard
 */
export default function CustomerRoot() {
  redirect("/customer/dashboard");
}
