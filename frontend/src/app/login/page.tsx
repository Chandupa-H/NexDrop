import Link from "next/link";
import { Package2 } from "lucide-react";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";

export const metadata = {
  title: "Sign In - NexDrop",
  description: "Sign in to your NexDrop courier and delivery management account",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Package2 className="h-6 w-6" />
            </div>
            <span>NexDrop</span>
          </Link>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">
            Account Authentication
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign in or create an account to access the platform
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
          <SupabaseAuthForm
            providers={["google"]}
            onSuccessRedirect="/courier/dashboard"
          />
        </div>

        <p className="text-center text-xs text-gray-400">
          Secure authentication powered by Supabase Auth
        </p>
      </div>
    </main>
  );
}

