"use client";

import React, { useEffect, useState } from "react";
import { insuranceService } from "@/features/insurance/services/insuranceService";
import {
  InsuranceOverviewData,
  InsuranceClaim,
  ClaimTimelineStage,
} from "@/features/insurance/types";
import { InsuranceOverviewCards } from "@/features/insurance/components/InsuranceOverviewCards";
import { ClaimsManagementTable } from "@/features/insurance/components/ClaimsManagementTable";
import { AIClaimSummaryCard } from "@/features/insurance/components/AIClaimSummaryCard";
import { ClaimTimelineVisualizer } from "@/features/insurance/components/ClaimTimelineVisualizer";
import { ShieldCheck, FileSpreadsheet, Bot, Clock } from "lucide-react";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function InsuranceDashboardPage() {
  const [overview, setOverview] = useState<InsuranceOverviewData | null>(null);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, clms] = await Promise.all([
          insuranceService.getOverview(),
          insuranceService.getClaims(),
        ]);
        setOverview(ov);
        setClaims(clms);
        setSelectedClaim(clms[0] || null);
      } catch (err) {
        console.error("Failed to load insurance dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAdvanceStage = async (claimId: string, nextStage: ClaimTimelineStage) => {
    await insuranceService.updateClaimStage(claimId, nextStage);
    const updatedClaims = await insuranceService.getClaims();
    setClaims(updatedClaims);
    setSelectedClaim(updatedClaims.find((c) => c.id === claimId) || null);
  };

  const handleVerifyStatus = async (claimId: string) => {
    await insuranceService.updateClaimStatus(claimId, "Approved");
    const updatedClaims = await insuranceService.getClaims();
    setClaims(updatedClaims);
    setSelectedClaim(updatedClaims.find((c) => c.id === claimId) || null);
  };

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#1b4332]">Connecting to Payer Adjudication Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Insurance Employee", "Manager", "Admin"]} moduleName="Insurance & Claims Division">
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          {/* 1. Insurance Overview Cards */}
          <InsuranceOverviewCards overview={overview} />

          {/* 2. Side-by-side layout: Claims Table + AI Claim Summary + Claim Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Claims Management Table (7 cols) */}
            <div className="lg:col-span-7">
              <ClaimsManagementTable
                claims={claims}
                selectedClaimId={selectedClaim?.id || ""}
                onSelectClaim={(c) => setSelectedClaim(c)}
              />
            </div>

            {/* Right Column: AI Claim Summary & Timeline Visualizer (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {selectedClaim ? (
                <>
                  <AIClaimSummaryCard
                    claim={selectedClaim}
                    onVerifyStatus={handleVerifyStatus}
                  />
                  <ClaimTimelineVisualizer
                    claim={selectedClaim}
                    onAdvanceStage={handleAdvanceStage}
                  />
                </>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-[#e2e8df] text-xs text-[#627267] shadow-sm">
                  Select a claim to inspect AI summary and lifecycle timeline.
                </div>
              )}
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
