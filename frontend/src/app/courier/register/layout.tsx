import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Courier Registration — NexDrop",
  description: "Apply to deliver with NexDrop. Submit your details for secure review.",
};

export default function CourierRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary" aria-label="NexDrop home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-brand-lime" aria-hidden="true">N</span>
          <span className="text-lg">Nex<span className="text-brand-green">Drop</span></span>
        </Link>
        <p className="hidden sm:block text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
        <Link href="/login" className="sm:hidden text-sm font-semibold text-primary">Sign in</Link>
      </header>
      <main className="flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-border bg-white px-4 py-4 text-center text-xs text-muted-foreground">
        © NexDrop. <Link href="/privacy" className="hover:text-primary underline">Privacy</Link> · <Link href="/terms" className="hover:text-primary underline">Terms</Link>
      </footer>
    </div>
  );
}
