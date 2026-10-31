/**
 * Shared dashboard configuration contract.
 * Plain JSON-serializable data only (no components or functions).
 * Server components pass this config to client components.
 */

export type DashboardRole = "customer" | "merchant" | "courier" | "admin" | "dispatcher";
export type DashboardTone = "success" | "info" | "warning" | "danger" | "neutral";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  tone: Exclude<DashboardTone, "neutral">;
}

export type NavIconName =
  | "layout-dashboard"
  | "package"
  | "refresh-cw"
  | "camera"
  | "alert-triangle"
  | "history"
  | "user"
  | "truck"
  | "map-pin"
  | "box"
  | "check-circle"
  | "clock"
  | "phone"
  | "navigation"
  | "pencil"
  | "arrow-right"
  | "bell"
  | "search"
  | "menu"
  | "x";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: NavIconName;
  availability: "live" | "planned";
  match?: "exact" | "prefix";
  badge?: string | number;
  // TODO(platform): requiredPermission
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export interface DashboardRoleConfig {
  role: DashboardRole;
  roleLabel: string;
  basePath: string;
  homeHref: string;
  profileHref?: string;
  searchPlaceholder: string;
  nav: NavSection[];
}

export interface DashboardUser {
  id: string;
  name: string;
  roleLabel: string;
  avatarUrl?: string;
}
