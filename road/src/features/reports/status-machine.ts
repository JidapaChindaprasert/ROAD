import { DamageCategory, PublicStatus, ReportStatus, SuggestedSeverity, UserRole } from "./types";

export const PUBLIC_STATUS_MAPPING: Record<ReportStatus, PublicStatus> = {
  reported: "reported",
  acknowledged: "reported",
  assessing: "reported",
  scheduled: "reported",
  repairing: "repairing",
  resolved: "fixed",
  rejected: "reported",
  duplicate: "reported",
};

export const STATUS_DISPLAY_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    publicLabel: string;
    description: string;
    badgeVariant: "reported" | "repairing" | "fixed" | "danger" | "neutral";
  }
> = {
  reported: {
    label: "Reported",
    publicLabel: "Reported",
    description: "Submitted by community member",
    badgeVariant: "reported",
  },
  acknowledged: {
    label: "Acknowledged",
    publicLabel: "Acknowledged",
    description: "Received by local road maintenance operations",
    badgeVariant: "reported",
  },
  assessing: {
    label: "Under Assessment",
    publicLabel: "Assessing",
    description: "Field team evaluating damage scope & safety impact",
    badgeVariant: "reported",
  },
  scheduled: {
    label: "Repair Scheduled",
    publicLabel: "Scheduled",
    description: "Work crew assigned and scheduled for repair",
    badgeVariant: "reported",
  },
  repairing: {
    label: "In Progress",
    publicLabel: "Repairing",
    description: "Active road maintenance crew on site",
    badgeVariant: "repairing",
  },
  resolved: {
    label: "Fixed",
    publicLabel: "Fixed",
    description: "Work completed and verified",
    badgeVariant: "fixed",
  },
  rejected: {
    label: "Not Actionable",
    publicLabel: "Not Actionable",
    description: "Duplicate or out-of-jurisdiction report",
    badgeVariant: "danger",
  },
  duplicate: {
    label: "Duplicate",
    publicLabel: "Merged",
    description: "Merged with an existing incident report",
    badgeVariant: "neutral",
  },
};

export const DAMAGE_CATEGORY_CONFIG: Record<
  DamageCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: string;
    dangerLevel: "low" | "medium" | "high";
  }
> = {
  pothole: {
    label: "Pothole",
    shortLabel: "Pothole",
    description: "Depression or hole in the road surface",
    icon: "CircleDot",
    dangerLevel: "high",
  },
  crack: {
    label: "Road Surface Crack",
    shortLabel: "Crack",
    description: "Longitudinal, transverse, or alligator cracking",
    icon: "Split",
    dangerLevel: "medium",
  },
  surface_wear: {
    label: "Surface Wear & Rutting",
    shortLabel: "Wear",
    description: "Raveling, asphalt bleeding, or worn asphalt layer",
    icon: "Layers",
    dangerLevel: "low",
  },
  subsidence: {
    label: "Possible Sinkhole / Subsidence",
    shortLabel: "Subsidence",
    description: "Ground sinking, roadbed collapse, or depression",
    icon: "AlertTriangle",
    dangerLevel: "high",
  },
  obstruction: {
    label: "Debris / Obstruction",
    shortLabel: "Obstruction",
    description: "Loose material, fallen debris, or blocked lane",
    icon: "Barrier",
    dangerLevel: "high",
  },
  standing_water: {
    label: "Standing Water / Drainage",
    shortLabel: "Water",
    description: "Ponding or blocked drainage culvert",
    icon: "Droplets",
    dangerLevel: "medium",
  },
  other: {
    label: "Other Road Hazard",
    shortLabel: "Other",
    description: "Other road condition requiring inspection",
    icon: "HelpCircle",
    dangerLevel: "low",
  },
  uncertain: {
    label: "Uncertain / Needs Review",
    shortLabel: "Uncertain",
    description: "AI or reporter was unable to determine category",
    icon: "HelpCircle",
    dangerLevel: "low",
  },
};

// Valid staff status transitions
export const ALLOWED_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  reported: ["acknowledged", "assessing", "rejected", "duplicate"],
  acknowledged: ["assessing", "scheduled", "rejected", "duplicate"],
  assessing: ["scheduled", "repairing", "rejected", "duplicate"],
  scheduled: ["repairing", "assessing", "rejected"],
  repairing: ["resolved", "assessing"],
  resolved: ["assessing"], // Reopening capability with mandatory reason
  rejected: ["assessing"],
  duplicate: ["assessing"],
};

export function canTransitionStatus(
  currentStatus: ReportStatus,
  targetStatus: ReportStatus,
  actorRole: UserRole
): boolean {
  if (actorRole !== "staff" && actorRole !== "admin") {
    return false;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}
