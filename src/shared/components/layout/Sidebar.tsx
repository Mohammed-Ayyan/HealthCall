"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  KanbanSquare,
  BarChart3,
  Users,
  Bell,
  Settings,
  Sparkles,
  Activity,
  HeartPulse,
  Stethoscope,
  UserCheck,
  ShieldCheck,
  User,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Badge } from "@/shared/components/ui/Badge";
import { useAuth } from "@/features/platform/auth/authContext";
import { getRoleDashboard } from "@/features/platform/auth/rolePermissions";

const coreNavItems = [
  { label: "Operations Command", href: "/dashboard", icon: LayoutDashboard },
  { label: "Call Intelligence", href: "/calls", icon: PhoneCall, count: 6 },
  { label: "Actions & Kanban", href: "/actions", icon: KanbanSquare, count: 9 },
  { label: "Analytics & Vitality", href: "/analytics", icon: BarChart3 },
];

const rolePortals = [
  { label: "Patient Portal", href: "/patient/dashboard", icon: HeartPulse },
  { label: "Doctor Portal", href: "/doctor/dashboard", icon: Stethoscope },
  { label: "Reception Desk", href: "/reception/dashboard", icon: UserCheck },
  { label: "Insurance & Claims", href: "/insurance/dashboard", icon: ShieldCheck },
  { label: "Department Manager", href: "/manager/dashboard", icon: Activity },
  { label: "Hospital Admin", href: "/admin/dashboard", icon: Building2 },
];

const systemNavItems = [
  { label: "Staff & RBAC", href: "/users", icon: Users },
  { label: "My Profile & Timeline", href: "/profile", icon: User },
  { label: "Notifications", href: "/notifications", icon: Bell, alert: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

export interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ className, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const userDashboardUrl = isHydrated ? getRoleDashboard(user.role) : "";

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "w-64 flex-shrink-0 bg-white border-r border-[#e2e8df] flex flex-col justify-between p-4 select-none overflow-y-auto shadow-xs",
          isOpen
            ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl animate-in slide-in-from-left duration-200"
            : "hidden lg:flex z-30",
          className
        )}
      >
        <div className="space-y-6">
          {/* Brand Header - Solarpunk Light */}
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={handleNavClick}
              className="flex items-center gap-3 px-2 group"
            >
              <div className="h-10 w-10 rounded-xl bg-[#1b4332] flex items-center justify-center text-white shadow-sm group-hover:bg-[#2d6a4f] transition-all duration-300">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-[#142019] font-mono">
                    CareOps
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e8f5e9] text-[#1b4332] font-bold border border-[#c8e6c9]">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-[#627267] font-medium tracking-wide">
                  Healthcare Living System
                </p>
              </div>
            </Link>

            {isOpen && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-xl text-[#627267] hover:text-[#142019] hover:bg-[#f2f6f1] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Live Call Telephony Pill */}
          <Link
            href="/calls/call-live-001"
            onClick={handleNavClick}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#eaf7ee] border border-[#bbf0c8] hover:border-[#059669] transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
              </span>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-[#142019] group-hover:text-[#059669] flex items-center gap-1">
                  Live Speech Stream
                  <Sparkles className="h-3 w-3 text-[#059669] inline" />
                </p>
                <p className="text-[10px] text-[#627267]">Active Audio Intake</p>
              </div>
            </div>
            <Badge variant="green" size="sm">
              Triage
            </Badge>
          </Link>

          {/* Core Operations Console Navigation */}
          <nav className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#7d8f81]">
              Operations Console
            </p>
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-[#eaf5ec] text-[#1b4332] font-semibold border border-[#c2ded6] shadow-xs"
                      : "text-[#4a584e] hover:text-[#142019] hover:bg-[#f2f6f1] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-[#1b4332]" : "text-[#7d8f81] group-hover:text-[#142019]"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                        isActive ? "bg-[#c2ded6] text-[#1b4332]" : "bg-[#edf2ea] text-[#627267]"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Role-Based Portals Navigation */}
          <nav className="space-y-1 pt-2 border-t border-[#edf2ea]">
            <div className="px-3 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7d8f81]">
                Role Experiences
              </p>
              {isHydrated && (
                <span className="text-[9px] text-[#059669] font-medium font-mono">{user.role}</span>
              )}
            </div>
            {rolePortals.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href.replace("/dashboard", ""));
              const isAssignedRole = item.href === userDashboardUrl;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-[#eaf5ec] text-[#1b4332] font-semibold border border-[#c2ded6] shadow-xs"
                      : "text-[#4a584e] hover:text-[#142019] hover:bg-[#f2f6f1] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-[#1b4332]" : "text-[#7d8f81] group-hover:text-[#142019]"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {isAssignedRole && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#e8f5e9] text-[#1b4332] font-semibold border border-[#c8e6c9]">
                      Active
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System & Profile Navigation */}
          <nav className="space-y-1 pt-2 border-t border-[#edf2ea]">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#7d8f81]">
              System & Personal
            </p>
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-[#eaf5ec] text-[#1b4332] font-semibold border border-[#c2ded6] shadow-xs"
                      : "text-[#4a584e] hover:text-[#142019] hover:bg-[#f2f6f1] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-[#1b4332]" : "text-[#7d8f81] group-hover:text-[#142019]"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.alert && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97706] animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Info */}
        <div className="space-y-3 pt-4 border-t border-[#edf2ea]">
          <Link
            href="/landing"
            onClick={handleNavClick}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#f7f9f6] hover:bg-[#eef4ec] border border-[#e2e8df] text-xs text-[#334139] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#059669]" />
              <span>Living System Manifesto</span>
            </div>
            <span className="text-[10px] text-[#1b4332] bg-[#e8f5e9] px-1.5 py-0.5 rounded border border-[#c8e6c9] font-medium">
              Solarpunk
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
