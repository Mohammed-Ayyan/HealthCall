"use client";

import React, { useState } from "react";
import { Users, UserPlus, Shield, UserX, CheckCircle2, Lock, Mail } from "lucide-react";
import { AdminUser } from "../types";
import { adminService } from "../services/adminService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input, Select } from "@/shared/components/ui/Input";

export interface UserManagementTableProps {
  initialUsers: AdminUser[];
}

export function UserManagementTable({ initialUsers }: UserManagementTableProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("Doctor");
  const [department, setDepartment] = useState("Post-Surgical General");

  const handleToggleStatus = async (id: string) => {
    await adminService.toggleUserStatus(id);
    setUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "Active" ? "Deactivated" : "Active" }
          : u
      )
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await adminService.createUser({
      name,
      email,
      role,
      department,
      status: "Active",
      permissionsCount: role === "Doctor" ? 8 : role === "Department Manager" ? 12 : 6,
    });
    setUsers([created, ...users]);
    setIsCreateModalOpen(false);
    setName("");
    setEmail("");
  };

  return (
    <>
      <Card className="bg-white border-[#e2e8df] shadow-sm">
        <CardHeader className="border-b border-[#edf2ea] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-[#142019]">Universal RBAC & User Administration</CardTitle>
                <p className="text-xs text-[#627267] mt-0.5">
                  Manage role-based entitlements across clinicians, reception, insurance, and executive leads
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create User Account</span>
            </Button>
          </div>
        </CardHeader>

        <div className="divide-y divide-[#edf2ea]">
          {users.map((user) => (
            <div
              key={user.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold font-mono text-xs">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{user.name}</h4>
                    <Badge variant="teal" size="sm">
                      {user.role}
                    </Badge>
                    <Badge
                      variant={user.status === "Active" ? "emerald" : "rose"}
                      size="sm"
                    >
                      {user.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#28382e] mt-1 flex items-center gap-2">
                    <Mail className="h-3 w-3 text-[#627267]" />
                    <span className="font-mono text-[#142019]">{user.email}</span> •{" "}
                    <span className="text-[#627267]">{user.department}</span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#627267] mt-2 font-mono flex-wrap">
                    <span>Last Active: {user.lastLogin}</span>
                    <span>•</span>
                    <span className="text-[#059669] flex items-center gap-1 font-semibold">
                      <Lock className="h-3 w-3" /> {user.permissionsCount} Policies Enabled
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(user.id)}
                  className={
                    user.status === "Active"
                      ? "border-[#fecaca] text-[#dc2626] hover:bg-[#fff5f5]"
                      : "border-[#dce8df] text-[#059669] hover:bg-[#f0fdf4]"
                  }
                >
                  {user.status === "Active" ? (
                    <>
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      <span>Reactivate</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create User Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Healthcare System Account"
        className="max-w-md bg-white border-[#e2e8df]"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Full Legal Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Jordan Hayes"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Enterprise Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="jordan.h@metrohealth.eco"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                System Role
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                options={[
                  { label: "Doctor", value: "Doctor" },
                  { label: "Receptionist", value: "Receptionist" },
                  { label: "Insurance Employee", value: "Insurance Employee" },
                  { label: "Department Manager", value: "Department Manager" },
                  { label: "Hospital Administrator", value: "Hospital Administrator" },
                  { label: "Patient", value: "Patient" },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Department
              </label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#edf2ea]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Provision User
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
