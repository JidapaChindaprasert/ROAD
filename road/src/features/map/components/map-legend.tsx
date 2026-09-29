import * as React from "react";

export function MapLegend({ className = "" }: { className?: string }) {
  const legendItems = [
    { label: "Reported", color: "#B45309", bg: "#FFF3D8" },
    { label: "Repairing", color: "#4338CA", bg: "#ECEBFF" },
    { label: "Fixed", color: "#047857", bg: "#DCFCE7" },
  ];

  return (
    <div
      className={`glass-panel px-3 py-2 rounded-xl text-xs flex items-center gap-3 border border-border shadow-xs ${className}`}
    >
      <span className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider">
        Status
      </span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-2xs shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-text-primary text-[11px] font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
