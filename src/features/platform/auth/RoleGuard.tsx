"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, RefreshCw, ArrowRight } from "lucide-react";
import { UserRole } from "@/shared/types/user";
import { useAuth } from "./authContext";
import { getRoleDashboard } from "./rolePermissions";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  moduleName?: string;
  autoRedirect?: boolean;
}

export function RoleGuard({
  allowedRoles,
  children,
  moduleName,
  autoRedirect = false,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, role, switchRole, isHydrated } = useAuth();
  const [countdown, setCountdown] = useState(3);

  const isAuthorized = allowedRoles.includes(role);
  const userDashboard = getRoleDashboard(role);
  const targetRole = allowedRoles[0];

  useEffect(() => {
    if (isHydrated && !isAuthorized && autoRedirect) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push(userDashboard);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthorized, autoRedirect, userDashboard, router]);

  if (!isHydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-[#627267]">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleSimulateSwitch = (target: UserRole) => {
    switchRole(target);
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 border-[#e2e8df] shadow-md bg-white text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center text-[#dc2626]">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <Badge variant="rose" size="md">
            Credential Boundary
          </Badge>
          <h2 className="text-xl font-bold text-[#142019] tracking-tight">
            Role Permission Required
          </h2>
          <p className="text-xs text-[#627267] leading-relaxed">
            You are currently signed in as <strong className="text-[#142019]">{user.name}</strong> with the{" "}
            <strong className="text-[#1b4332]">{role}</strong> persona.
          </p>
        </div>

        <div className="bg-[#f7f9f6] p-4 rounded-xl border border-[#e2e8df] text-left text-xs space-y-2">
          <p className="font-semibold text-[#142019]">
            Authorized Roles for {moduleName || "this Operational Zone"}:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {allowedRoles.map((r) => (
              <span
                key={r}
                className="px-2.5 py-1 rounded-md bg-[#e8f5e9] text-[#1b4332] font-semibold border border-[#c8e6c9] text-[11px]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {autoRedirect && (
          <p className="text-xs text-[#059669] font-medium animate-pulse">
            Redirecting to your authorized dashboard in {countdown}s...
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href={userDashboard} className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full gap-2 border-[#d6ded4] text-[#334139]">
              <span>Return to My Dashboard</span>
            </Button>
          </Link>

          <Link href="/auth/login" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full gap-2"
            >
              <span>Sign In with {targetRole}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-[#627267] pt-2">
          Authentication & Role-Based Access Control enforced by CareOps Security Matrix.
        </p>
      </Card>
    </div>
  );
}
