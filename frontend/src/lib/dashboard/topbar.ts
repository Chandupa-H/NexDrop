import type { DashboardRoleConfig, NavItem } from "./types";

export function getTopbarTitle(config: DashboardRoleConfig, pathname: string): string {
  const homeTitle = `${config.roleLabel} Dashboard`;
  if (pathname === config.homeHref) return homeTitle;
  if (config.profileHref && (pathname === config.profileHref || pathname.startsWith(config.profileHref + '/'))) {
    return 'Profile';
  }

  const activeItem = config.nav
    .flatMap((section) => section.items)
    .find((item: NavItem) => {
      if (item.availability !== "live") return false;
      return item.match === "exact"
        ? pathname === item.href
        : pathname.startsWith(item.href);
    });

  return activeItem?.label ?? homeTitle;
}
