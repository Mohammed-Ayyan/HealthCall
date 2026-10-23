"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Sparkles,
  PhoneCall,
  UserCheck,
  ChevronDown,
  Check,
  ExternalLink,
  LogOut,
  Menu,
} from "lucide-react";
import { UserRole } from "@/shared/types/user";
import { useAuth } from "@/features/platform/auth/authContext";
import { getRoleDashboard } from "@/features/platform/auth/rolePermissions";
import { mockNotificationsService } from "@/features/platform/mockNotificationsService";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { NotificationDropdown } from "@/features/platform/components/NotificationDropdown";

export interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSimulator: () => void;
  onToggleMobileMenu?: () => void;
}

export function Header({
  onOpenSearch,
  onOpenSimulator,
  onToggleMobileMenu,
}: HeaderProps) {
  const router = useRouter();
  const { user, role, logout, isHydrated } = useAuth();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(mockNotificationsService.getUnreadCount());

  const handleLogout = async () => {
    setIsRoleMenuOpen(false);
    await logout();
    router.push("/auth/login");
  };

  return (
    <header className="h-16 border-b border-[#e2e8df] bg-white/95 px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0 shadow-2xs backdrop-blur-md">
      {/* Left Search Bar & Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-[#f7f9f6] border border-[#e2e8df] text-[#425247] hover:text-[#142019] transition-colors cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#f7f9f6] border border-[#e2e8df] hover:border-[#059669] text-[#627267] hover:text-[#142019] text-xs transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 text-[#059669] transition-colors" />
            <span>Search patients, doctors, claims, calls, tasks...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-[#d8e2d6] text-[10px] font-mono text-[#1b4332] shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Action Items */}
      <div className="flex items-center gap-3">
        {/* Simulate Live Inbound Call Button */}
        <Button
          onClick={onOpenSimulator}
          variant="primary"
          size="sm"
          className="gap-1.5 text-xs font-semibold"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Simulate Inbound Call</span>
          <span className="sm:hidden">Simulate</span>
        </Button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative h-9 w-9 rounded-xl bg-[#f7f9f6] border border-[#e2e8df] hover:border-[#059669] text-[#425247] hover:text-[#142019] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#dc2626] text-[10px] font-bold text-white flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <NotificationDropdown
              onClose={() => setIsNotifOpen(false)}
              onCountChange={(cnt) => setUnreadCount(cnt)}
            />
          )}
        </div>

        {/* Role Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-[#f7f9f6] border border-[#e2e8df] hover:border-[#059669] transition-all cursor-pointer group shadow-2xs"
            aria-label="User role switcher"
          >
            {!isHydrated ? (
              <>
                <div className="h-7 w-7 rounded-lg bg-[#e2e8df] animate-pulse" />
                <div className="text-left hidden md:flex flex-col gap-1">
                  <div className="h-3 w-20 bg-[#e2e8df] rounded animate-pulse" />
                  <div className="h-2 w-14 bg-[#e2e8df] rounded animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-7 w-7 rounded-lg object-cover border border-[#d8e2d6] group-hover:border-[#059669] transition-colors"
                />
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-[#142019] leading-tight">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#059669] font-semibold">
                      {user.role}
                    </span>
                    <span className="text-[10px] text-[#7d8f81]">• {user.department}</span>
                  </div>
                </div>
              </>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-[#7d8f81] group-hover:text-[#142019] transition-transform" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#e2e8df] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#142019]">
              <div className="px-2.5 py-2 border-b border-[#edf2ea]">
                <p className="text-[10px] uppercase font-bold text-[#059669] tracking-wider flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  Verified Database Session
                </p>
                <p className="text-xs font-bold text-[#142019] mt-0.5">
                  {user.name}
                </p>
                <p className="text-[11px] text-[#627267] truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#1b4332] font-semibold border border-[#c8e6c9]">
                    {user.role}
                  </span>
                  {user.department && (
                    <span className="text-[10px] text-[#627267] truncate">• {user.department}</span>
                  )}
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  href={getRoleDashboard(role)}
                  onClick={() => setIsRoleMenuOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#334139] hover:text-[#142019] hover:bg-[#edf5ee] transition-colors group"
                >
                  <span>My Assigned Portal</span>
                  <ExternalLink className="h-3 w-3 text-[#94a390] group-hover:text-[#142019]" />
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsRoleMenuOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#334139] hover:text-[#142019] hover:bg-[#edf5ee] transition-colors group"
                >
                  <span>Profile & Security Credentials</span>
                  <ExternalLink className="h-3 w-3 text-[#94a390] group-hover:text-[#142019]" />
                </Link>
              </div>

              <div className="pt-2 border-t border-[#edf2ea] space-y-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors font-medium text-left cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
