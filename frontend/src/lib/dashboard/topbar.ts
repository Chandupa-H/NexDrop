import type { DashboardRoleConfig, NavItem } from "./types";

export function getTopbarTitle(
  config: DashboardRoleConfig,
  pathname: string,
  searchParams?: { get: (name: string) => string | null } | null
): string {
  if (config.topbarTitle) return config.topbarTitle;

  const homeTitle = `${config.roleLabel} Dashboard`;
  if (pathname === config.homeHref) return homeTitle;
  if (config.profileHref && (pathname === config.profileHref || pathname.startsWith(config.profileHref + '/'))) {
    return 'Profile';
  }

  // When viewing receipt redirected from track parcel page, show Track Parcel
  if (pathname.startsWith('/customer/history/receipt') && searchParams?.get('from') === 'track') {
    const trackItem = config.nav.flatMap((s) => s.items).find((item) => item.href === '/customer/track' || item.id === 'track');
    if (trackItem) return trackItem.label;
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
