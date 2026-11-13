"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  resolveUserRole,
  resolveUserDashboardPath,
} from "@/lib/auth/routes";

export interface AuthUserState {
  user: User | null;
  role: string | null;
  dashboardHref: string;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dashboardHref, setDashboardHref] = useState<string>(
    DEFAULT_AUTHENTICATED_REDIRECT
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        const resolvedRole = await resolveUserRole(supabase, currentUser.id);
        const target = await resolveUserDashboardPath(
          supabase,
          currentUser.id,
          DEFAULT_AUTHENTICATED_REDIRECT
        );
        setRole(resolvedRole);
        setDashboardHref(target);
      } else {
        setRole(null);
        setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
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
          const target = await resolveUserDashboardPath(
            supabase,
            currentUser.id,
            DEFAULT_AUTHENTICATED_REDIRECT
          );
          if (active) {
            setRole(resolvedRole);
            setDashboardHref(target);
          }
        } else {
          if (active) {
            setRole(null);
            setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
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
        const target = await resolveUserDashboardPath(
          supabase,
          nextUser.id,
          DEFAULT_AUTHENTICATED_REDIRECT
        );
        if (active) {
          setRole(resolvedRole);
          setDashboardHref(target);
        }
      } else {
        setRole(null);
        setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
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
  }, []);

  return { user, role, dashboardHref, isLoading, signOut, refresh: syncUser };
}
