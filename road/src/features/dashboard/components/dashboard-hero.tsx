import * as React from "react";
import Link from "next/link";
import { PlusCircle, Map, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-soft/60 via-surface to-surface border border-brand/20 p-6 sm:p-10 md:p-12 shadow-sm">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-bright/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-5">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand text-xs font-bold uppercase tracking-wider shadow-2xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Bangkok Municipal Road Damage Tracker</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-text-primary tracking-tight leading-[1.1]">
          Better roads start with a <span className="text-brand">signal</span>.
        </h1>

        {/* Subtitle / Core Promise */}
        <p className="text-base sm:text-lg md:text-xl text-text-secondary leading-relaxed font-normal">
          Spot a pothole, road crack, or flood hazard? Drop a photo and let our Roboflow AI classify the damage. Follow real-time repairs from report to resolution.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Link href="/report/new" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full sm:w-auto font-bold shadow-md hover:shadow-lg gap-2 text-base justify-center">
              <PlusCircle className="h-5 w-5" />
              <span>Report Road Damage</span>
            </Button>
          </Link>

          <Link href="/map" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold gap-2 text-base bg-surface/80 backdrop-blur-xs justify-center">
              <Map className="h-5 w-5 text-brand" />
              <span>Open Live Map</span>
            </Button>
          </Link>
        </div>

        {/* Small trust note */}
        <div className="flex items-center gap-2 pt-3 text-xs text-text-muted">
          <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
          <span>Transparent public audit trail • GPS-verified • Roboflow vision assistance</span>
        </div>
      </div>
    </div>
  );
}
