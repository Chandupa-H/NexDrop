"use client";

import { RefreshCw, FileText, Camera, AlertTriangle } from "lucide-react";
import type { ActionType } from "../types";

interface QuickActionsProps {
  onSelectAction: (action: ActionType) => void;
}

interface ActionTile {
  action: ActionType;
  label: string;
  desc: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const ACTION_TILES: ActionTile[] = [
  {
    action: "update-status",
    label: "Update Status",
    desc: "Change parcel state",
    icon: RefreshCw,
    iconBg: "bg-[#E3F6E8]",
    iconColor: "text-[#12703A]",
  },
  {
    action: "add-note",
    label: "Add Note",
    desc: "Attach instructions",
    icon: FileText,
    iconBg: "bg-[#E4EEFF]",
    iconColor: "text-[#1D4ED8]",
  },
  {
    action: "upload-proof",
    label: "Upload Proof",
    desc: "Signature or photo",
    icon: Camera,
    iconBg: "bg-[#DDF4F1]",
    iconColor: "text-[#0F766E]",
  },
  {
    action: "report-failed",
    label: "Report Failed",
    desc: "Log delivery issue",
    icon: AlertTriangle,
    iconBg: "bg-[#FDE4E4]",
    iconColor: "text-[#B42318]",
  },
];

export function QuickActions({ onSelectAction }: QuickActionsProps) {
  return (
    <div className="ct-card flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-[#0F2A1D]" style={{ letterSpacing: "-0.01em" }}>
          Quick Actions
        </h2>
        <p className="text-xs text-[#5B7266] mt-0.5">Quickly update active delivery</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {ACTION_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.action}
              type="button"
              onClick={() => onSelectAction(tile.action)}
              className="p-3 rounded-xl bg-[#F2F7F3] hover:bg-[#E5EEE8] transition-all text-left flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] group"
              aria-label={`${tile.label} for current delivery`}
            >
              <div
                className={`h-8 w-8 rounded-lg ${tile.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                aria-hidden="true"
              >
                <Icon className={`h-4 w-4 ${tile.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F2A1D]">{tile.label}</p>
                <p className="text-[10px] text-[#5B7266] mt-0.5 leading-tight">{tile.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
