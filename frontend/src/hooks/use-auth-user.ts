"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  resolveUserRole,
  getDashboardPathForRole,
} from "@/lib/auth/routes";

export interface AuthUserState {
  user: User | null;
  role: string | null;
  dashboardHref: string;
  isDashboardAccessible: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

function checkDashboardAccessible(userRole: string | null, user: User | null): boolean {
  if (!user) return false;

  const role = userRole?.toLowerCase();
  // Admin, courier, dispatcher always have accessible operational dashboards
  if (role === "admin" || role === "courier" || role === "dispatcher") {
    return true;
  }

  // Admin user metadata check
  if (
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin"
  ) {
    return true;
  }

  // For merchant: must have an application that is explicitly approved
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("nexdrop_merchant_application");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.approval_status === "approved") {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  // Not yet registered or pending approval -> unclickable
  return false;
}

export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dashboardHref, setDashboardHref] = useState<string>(
    DEFAULT_AUTHENTICATED_REDIRECT
  );
  const [isDashboardAccessible, setIsDashboardAccessible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        const resolvedRole = await resolveUserRole(supabase, currentUser.id);
        const target = getDashboardPathForRole(resolvedRole);
        setRole(resolvedRole);
        setDashboardHref(target);
        setIsDashboardAccessible(checkDashboardAccessible(resolvedRole, currentUser));
      } else {
        setRole(null);
        setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
        setIsDashboardAccessible(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialSync() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!active) return;
        setUser(currentUser);

        if (currentUser) {
          const resolvedRole = await resolveUserRole(supabase, currentUser.id);
          const target = getDashboardPathForRole(resolvedRole);
          if (active) {
            setRole(resolvedRole);
            setDashboardHref(target);
            setIsDashboardAccessible(checkDashboardAccessible(resolvedRole, currentUser));
          }
        } else {
          if (active) {
            setRole(null);
            setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
            setIsDashboardAccessible(false);
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    initialSync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(false);

      if (nextUser) {
        const resolvedRole = await resolveUserRole(supabase, nextUser.id);
        const target = getDashboardPathForRole(resolvedRole);
        if (active) {
          setRole(resolvedRole);
          setDashboardHref(target);
          setIsDashboardAccessible(checkDashboardAccessible(resolvedRole, nextUser));
        }
      } else {
        setRole(null);
        setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
        setIsDashboardAccessible(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
    setIsDashboardAccessible(false);
  }, []);

  return { user, role, dashboardHref, isDashboardAccessible, isLoading, signOut, refresh: syncUser };
}
