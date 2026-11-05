import { redirect } from "next/navigation";

/**
 * /courier → redirect to /courier/dashboard
 */
export default function CourierRoot() {
  redirect("/courier/dashboard");
}
