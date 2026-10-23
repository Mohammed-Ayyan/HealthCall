"use client";

import React, { useEffect, useState } from "react";
import { adminService } from "@/features/admin/services/adminService";
import {
  AdminOverviewData,
  AdminUser,
  HospitalDepartment,
  SystemRuleConfig,
} from "@/features/admin/types";
import { AdminOverviewCards } from "@/features/admin/components/AdminOverviewCards";
import { UserManagementTable } from "@/features/admin/components/UserManagementTable";
import { DepartmentManagementCard } from "@/features/admin/components/DepartmentManagementCard";
import { SystemSettingsManager } from "@/features/admin/components/SystemSettingsManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/Tabs";
import { Users, Building2, Sliders, Shield } from "lucide-react";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [rules, setRules] = useState<SystemRuleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, usrs, depts, rls] = await Promise.all([
          adminService.getOverview(),
          adminService.getUsers(),
          adminService.getDepartments(),
          adminService.getSystemRules(),
        ]);
        setOverview(ov);
        setUsers(usrs);
        setDepartments(depts);
        setRules(rls);
      } catch (err) {
        console.error("Failed to load admin dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#1b4332]">Initializing Executive Healthcare Control Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Admin"]} moduleName="Hospital Executive & Universal Admin Control">
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          {/* 1. Admin Overview Cards */}
          <AdminOverviewCards overview={overview} />

          {/* 2. Admin Operational Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-[#edf2ea] border border-[#d8e2d6] p-1 rounded-xl">
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Users className="h-4 w-4" />
                User RBAC Directory ({users.length})
              </TabsTrigger>
              <TabsTrigger
                value="departments"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Building2 className="h-4 w-4" />
                Hospital Departments ({departments.length})
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Sliders className="h-4 w-4" />
                System & Routing Rules ({rules.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <UserManagementTable initialUsers={users} />
            </TabsContent>

            <TabsContent value="departments" className="mt-6">
              <DepartmentManagementCard departments={departments} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <SystemSettingsManager initialRules={rules} />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
