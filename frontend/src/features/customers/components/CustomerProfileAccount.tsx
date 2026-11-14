"use client";

import { useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerAccountProfile } from "../api/customer.api";
import { mapCustomerProfile } from "../api/customer.mappers";
import { profileRequestError } from "../lib/profile-validation";
import type { CustomerProfile } from "../types";
import { CustomerProfileView } from "./CustomerProfileView";

export function CustomerProfileAccount() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; profile?: CustomerProfile; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    getCustomerAccountProfile()
      .then((dto) => { if (active) setResult({ attempt, profile: mapCustomerProfile(dto) }); })
      .catch((error: unknown) => { if (active) setResult({ attempt, error: profileRequestError(error).message }); });
    return () => { active = false; };
  }, [attempt]);
  const current = result?.attempt === attempt ? result : null;
  if (current?.profile) return <CustomerProfileView initialProfile={current.profile} />;
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Manage your personal contact information and delivery preferences" />
      {!current ? <div role="status" className="space-y-4"><span>Loading customer account...</span><Skeleton className="h-64 rounded-xl" /></div> : (
        <SectionCard title="Customer account unavailable">
          <p role="alert" className="mb-4 text-sm">{current.error}</p>
          <Button variant="outline" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>Retry account lookup</Button>
        </SectionCard>
      )}
      <p className="text-sm text-muted-foreground">Account deletion is disabled pending verified ownership and account-lifecycle integration.</p>
    </div>
  );
}
