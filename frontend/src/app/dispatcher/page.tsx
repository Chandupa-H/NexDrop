import { redirect } from "next/navigation";

/**
 * /dispatcher → redirect to /dispatcher/dashboard
 */
export default function DispatcherRoot() {
  redirect("/dispatcher/dashboard");
}

