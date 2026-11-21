"use client";

import { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Robustly apply or remove dark mode across HTML root, document body,
 * and any scoped .dashboard-theme elements.
 */
export function applyTheme(isDark: boolean) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;

  if (isDark) {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    if (body) {
      body.classList.add("dark");
      body.setAttribute("data-theme", "dark");
    }
    document.querySelectorAll(".dashboard-theme").forEach((el) => {
      el.classList.add("dark");
      el.setAttribute("data-theme", "dark");
    });
    try {
      localStorage.setItem("nexdrop-theme", "dark");
    } catch {
      // ignore in sandboxed iframes
    }
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    if (body) {
      body.classList.remove("dark");
      body.setAttribute("data-theme", "light");
    }
    document.querySelectorAll(".dashboard-theme").forEach((el) => {
      el.classList.remove("dark");
      el.setAttribute("data-theme", "light");
    });
    try {
      localStorage.setItem("nexdrop-theme", "light");
    } catch {
      // ignore
    }
  }

  try {
    window.dispatchEvent(new CustomEvent("themechange", { detail: { isDark } }));
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = typeof window !== "undefined" ? localStorage.getItem("nexdrop-theme") : null;
    const systemDark =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentIsDark = stored === "dark" || (!stored && systemDark) || document.documentElement.classList.contains("dark");

    setIsDark(currentIsDark);
    applyTheme(currentIsDark);

    const onThemeChange = () => {
      const active =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(active);
    };

    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    const nextDark = !isCurrentlyDark;
    applyTheme(nextDark);
    setIsDark(nextDark);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="dashboard-theme-toggle flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--dashboard-hairline)] bg-[var(--dashboard-search-bg)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-control-bg)] hover:text-[var(--dashboard-primary)] transition-all cursor-pointer shadow-xs focus:outline-none"
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted && isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--dashboard-muted)] transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}

export function ThemeToggleMenuItem() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = typeof window !== "undefined" ? localStorage.getItem("nexdrop-theme") : null;
    const systemDark =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentIsDark = stored === "dark" || (!stored && systemDark) || document.documentElement.classList.contains("dark");

    setIsDark(currentIsDark);

    const onThemeChange = () => {
      const active =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(active);
    };

    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    const nextDark = !isCurrentlyDark;
    applyTheme(nextDark);
    setIsDark(nextDark);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-[#F0FDF4] hover:text-[#064E3B] dark:hover:bg-[#143525] dark:hover:text-[#22c55e] font-medium transition-colors cursor-pointer text-xs"
      role="menuitem"
    >
      <span className="flex items-center gap-2.5">
        {mounted && isDark ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-[#064E3B] dark:text-[#22c55e]" />
        )}
        <span>{mounted && isDark ? "Light Mode" : "Dark Mode"}</span>
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
        {mounted && isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
