import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Team & Ownership — ROAD",
  description: "Meet the engineering project owners behind ROAD Civic Damage Intel.",
};

const TEAM_MEMBERS = [
  {
    name: "Jidapa Chindaprasert",
    studentId: "67050066",
    role: "Project Lead & Full-Stack Engineer",
    focus: "System Architecture, Realtime State Machine & UI/UX",
  },
  {
    name: "Thitima Nawpraya",
    studentId: "67050128",
    role: "Core Engineer",
    focus: "AI Integration, Vision Pipeline & Model Inference",
  },
  {
    name: "Sirawuth Butyojunto",
    studentId: "67050571",
    role: "Core Engineer",
    focus: "Community Map Engine, Geolocation & GIS Spatial Logic",
  },
  {
    name: "Surapitch Butyojunto",
    studentId: "67050603",
    role: "Core Engineer",
    focus: "Operations Dispatch, Workflow Engine & Triage Queue",
  },
  {
    name: "Aniwat Siaram",
    studentId: "67051242",
    role: "Core Engineer",
    focus: "Data Verification, Security Architecture & Test Suites",
  },
];

export default function AboutPage() {
  return (
    <PageContainer size="md" className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-soft/80 via-surface to-surface border border-brand/20 p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand/10 blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="h-4 w-4" />
            <span>Engineering Project Team</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
            Meet the Owners of <span className="text-brand">ROAD</span>
          </h1>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
            ROAD (Road Observation &amp; Automated Dispatch) was engineered to empower communities with instant road damage reporting, computer vision classification, and an accountable, real-time public repair timeline.
          </p>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Users className="h-4 w-4 text-brand" />
            <span>Project Owners &amp; Contributors ({TEAM_MEMBERS.length})</span>
          </div>
          <Badge variant="outline" size="sm" className="font-mono">
            KMITL
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEAM_MEMBERS.map((member, index) => (
            <Card
              key={member.studentId}
              className="p-5 hover:shadow-md hover:border-brand/40 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand font-black text-sm flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                    0{index + 1}
                  </div>
                  <Badge variant="brand" size="sm" className="font-mono font-bold">
                    {member.studentId}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-xs font-medium text-text-secondary mt-0.5">
                    {member.role}
                  </p>
                </div>

                <p className="text-xs text-text-muted leading-relaxed pt-2 border-t border-border-subtle">
                  {member.focus}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Mission & Values Box */}
      <Card className="bg-surface-muted/40 border-border p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-primary">
              Mission: Transparent Civic Infrastructure
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every citizen deserves safe, well-maintained roads. By combining modern mobile web accessibility, automated AI verification, and transparent civic tracking, ROAD closes the gap between citizens discovering road hazards and municipal crews fixing them.
            </p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
