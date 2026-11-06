/**
 * Maps NavIconName to lucide-react icons.
 */

import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Camera,
  AlertTriangle,
  History,
  User,
  Truck,
  MapPin,
  Box,
  CheckCircle,
  Clock,
  Phone,
  Navigation,
  Pencil,
  ArrowRight,
  Bell,
  Search,
  Menu,
  X,
  Key,
  Webhook,
  PlusCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/lib/dashboard/types";

export const iconMap: Record<NavIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  package: Package,
  "refresh-cw": RefreshCw,
  camera: Camera,
  "alert-triangle": AlertTriangle,
  history: History,
  user: User,
  truck: Truck,
  "map-pin": MapPin,
  box: Box,
  "check-circle": CheckCircle,
  clock: Clock,
  phone: Phone,
  navigation: Navigation,
  pencil: Pencil,
  "arrow-right": ArrowRight,
  bell: Bell,
  search: Search,
  menu: Menu,
  x: X,
  key: Key,
  webhook: Webhook,
  "plus-circle": PlusCircle,
  "shield-check": ShieldCheck,
};

export function getIcon(name: NavIconName): LucideIcon {
  return iconMap[name] || Package;
}
