"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./authContext";

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, loading, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, loading, isHydrated, router]);

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9f6]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#1b4332]">Authenticating healthcare session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
