"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_AUTHENTICATED_REDIRECT,
  resolveUserDashboardPath,
} from "@/lib/auth/routes";

export interface AuthUserState {
  user: User | null;
  dashboardHref: string;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(null);
  const [dashboardHref, setDashboardHref] = useState<string>(
    DEFAULT_AUTHENTICATED_REDIRECT
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function syncUser() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!active) return;
        setUser(currentUser);

        if (currentUser) {
          const target = await resolveUserDashboardPath(
            supabase,
            currentUser.id,
            DEFAULT_AUTHENTICATED_REDIRECT
          );
          if (active) setDashboardHref(target);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(false);

      if (nextUser) {
        const target = await resolveUserDashboardPath(
          supabase,
          nextUser.id,
          DEFAULT_AUTHENTICATED_REDIRECT
        );
        if (active) setDashboardHref(target);
      } else {
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
    setDashboardHref(DEFAULT_AUTHENTICATED_REDIRECT);
  }, []);

  return { user, dashboardHref, isLoading, signOut };
}

