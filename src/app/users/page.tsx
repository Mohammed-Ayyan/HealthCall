"use client";

import React, { useState, useEffect } from "react";
import { Users, Shield, UserCheck, Key, Lock } from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { UserManagementTable } from "@/features/platform/components/UserManagementTable";
import { apiUserService } from "@/features/platform/users/apiUserService";
import { User } from "@/shared/types/user";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const list = await apiUserService.getUsers();
    setUsers(list);
    setLoading(false);
  };

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Admin", "Manager"]} moduleName="Staff & RBAC Governance">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                User Management & Access Control
              </h1>
              <Badge variant="teal" size="sm">
                RBAC Governance
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Administer hospital personnel, departmental task queues, and role-based permissions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#607264]">
              Active Personas: <strong className="text-[#059669]">{users.length} Users</strong>
            </span>
          </div>
        </div>

        {/* Roles Breakdown Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { role: "Admin", desc: "Full system & RBAC controls", count: 1, color: "border-red-200 text-red-700 bg-red-50/40" },
            { role: "Doctor", desc: "Clinical review & approvals", count: 2, color: "border-emerald-200 text-[#059669] bg-emerald-50/40" },
            { role: "Receptionist", desc: "Appointment scheduling", count: 1, color: "border-teal-200 text-[#0d9488] bg-teal-50/40" },
            { role: "Insurance Employee", desc: "Prior-auth & claims", count: 1, color: "border-amber-200 text-[#d97706] bg-amber-50/40" },
            { role: "Manager", desc: "SLA escalations & reporting", count: 1, color: "border-[#c8e6c9] text-[#1b4332] bg-[#e8f5e9]/50" },
          ].map((r) => (
            <div key={r.role} className={`p-3 rounded-xl border ${r.color} space-y-1 shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{r.role}</span>
                <span className="text-xs font-mono font-bold bg-white text-[#142019] border border-[#e2e8e0] px-1.5 py-0.5 rounded shadow-2xs">
                  {r.count}
                </span>
              </div>
              <p className="text-[10px] text-[#607264] leading-snug">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* User Table with Add/Edit/Delete */}
        {!loading && <UserManagementTable initialUsers={users} />}
      </div>
      </RoleGuard>
    </AppShell>
  );
}
