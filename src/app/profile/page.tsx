"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  Clock,
  Activity,
  CheckCircle2,
  Bot,
  Calendar,
  Key,
  Award,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/features/platform/auth/authContext";

const activityTimelineItems = [
  {
    time: "Live Session",
    title: "Secure Session Verified",
    category: "Identity & RBAC",
    description: "Multi-factor JWT authenticated with verified role-based access permissions.",
    icon: Shield,
    highlight: "auth",
  },
  {
    time: "Real-time",
    title: "CareOps Clinical Data Sync",
    category: "MongoDB Cluster",
    description: "User profile synchronized with live enterprise database collections.",
    icon: Activity,
    highlight: "sync",
  },
  {
    time: "Automated",
    title: "CareOps Telephony Integration",
    category: "Speech AI",
    description: "Speech recognition and appointment dispatch gateway ready.",
    icon: Phone,
    highlight: "telephony",
  },
];

export default function ProfilePage() {
  const { user, isHydrated } = useAuth();

  const profile = {
    name: user?.name || "Active CareOps User",
    role: user?.role || "Staff Member",
    department: user?.department || "CareOps Clinical Operations",
    email: user?.email || "Not provided",
    phone: user?.phone || "+1 (555) 000-0000",
    npiOrId: user?.id ? `UID-${user.id.slice(-6).toUpperCase()}` : "NPI-PENDING",
    facility: "Metro Health Living System",
    station: user?.department ? `${user.department} Station` : "Command Station",
    avatar: user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    joinedDate: "Active Member",
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Profile Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef6f0] via-[#f4f9f5] to-[#fcfdfc] p-6 border border-[#d6e5da] shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-[#1b4332] shadow-sm"
            />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#142019] tracking-tight">
                  {profile.name}
                </h1>
                <Badge variant="teal" size="sm">
                  {profile.role}
                </Badge>
                <Badge variant="emerald" size="sm" className="font-mono">
                  {profile.npiOrId}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-1 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#059669]" />
                {profile.department} • <span className="text-[#142019] font-medium">{profile.facility}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm" className="bg-white/80">
              Verified Session
            </Badge>
          </div>
        </div>
      </div>

      {/* Grid: Contact & Identity Details (Left) + Activity Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-white border-[#e2e8df] shadow-sm">
            <CardHeader className="border-b border-[#edf2ea] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base text-[#142019]">Identity & Contact Verification</CardTitle>
                  <p className="text-xs text-[#627267] mt-0.5">Verified CareOps Enterprise Identity</p>
                </div>
              </div>
            </CardHeader>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfdfc] border border-[#e2e8df]">
                <span className="text-[#627267] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#059669]" /> Email Address
                </span>
                <span className="font-mono text-[#142019] font-semibold">{profile.email}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfdfc] border border-[#e2e8df]">
                <span className="text-[#627267] flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#0d9488]" /> Direct Phone
                </span>
                <span className="font-mono text-[#142019] font-semibold">{profile.phone}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfdfc] border border-[#e2e8df]">
                <span className="text-[#627267] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#d97706]" /> Station / Room
                </span>
                <span className="text-[#142019] font-semibold">{profile.station}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfdfc] border border-[#e2e8df]">
                <span className="text-[#627267] flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#627267]" /> Identity Token
                </span>
                <span className="font-mono text-[#059669] font-bold">{profile.npiOrId}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfdfc] border border-[#e2e8df]">
                <span className="text-[#627267] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#627267]" /> Member Since
                </span>
                <span className="text-[#142019] font-semibold">{profile.joinedDate}</span>
              </div>
            </div>
          </Card>

          {/* Role Direct Dashboard Navigation Link */}
          <Card className="bg-white border-[#e2e8df] p-5 shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#627267] mb-3">
              Role Dashboard Quick Jump
            </h4>
            <div className="space-y-2">
              <Link
                href="/patient/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Patient Experience Portal</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/doctor/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Physician & Clinician Station</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reception/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Reception & Intake Gateway</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/insurance/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Insurance & Prior-Auth Desk</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/manager/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Department Operations Command</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfdfc] hover:bg-[#f4f8f5] border border-[#e2e8df] hover:border-[#1b4332]/40 text-xs text-[#28382e] hover:text-[#1b4332] transition-all"
              >
                <span className="font-medium">Hospital Executive Master Console</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Activity Timeline (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="bg-white border-[#e2e8df] shadow-sm">
            <CardHeader className="border-b border-[#edf2ea] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-[#142019]">CareOps Activity Timeline</CardTitle>
                    <p className="text-xs text-[#627267] mt-0.5">
                      Sequential audit trail of patient calls, AI extractions, commitments, and staff routing
                    </p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">
                  Live Log
                </Badge>
              </div>
            </CardHeader>

            <div className="p-6">
              <div className="relative border-l-2 border-[#dce8df] ml-4 space-y-8">
                {activityTimelineItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="relative pl-7">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-[17px] top-0.5 h-8 w-8 rounded-full bg-white border-2 border-[#1b4332] flex items-center justify-center text-[#1b4332] shadow-xs">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="bg-[#fcfdfc] p-4 rounded-xl border border-[#e2e8df] hover:border-[#1b4332]/40 transition-all shadow-2xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-bold text-[#059669]">
                            {item.time}
                          </span>
                          <Badge variant="teal" size="sm">
                            {item.category}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-bold text-[#142019]">
                          {item.title}
                        </h4>
                        <p className="text-xs text-[#627267] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
