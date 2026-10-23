"use client";

import React, { useState } from "react";
import { User, UserRole } from "@/shared/types/user";
import { DepartmentName } from "@/shared/types/action";
import { apiUserService } from "@/features/platform/users/apiUserService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { Input, Select } from "@/shared/components/ui/Input";
import { Plus, Edit2, Trash2, Shield, UserCheck, Phone, Mail } from "lucide-react";

export interface UserManagementTableProps {
  initialUsers: User[];
  className?: string;
}

export function UserManagementTable({ initialUsers, className }: UserManagementTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Doctor");
  const [department, setDepartment] = useState<DepartmentName>("Clinical Team");
  const [phone, setPhone] = useState("+1 (555) 019-0000");

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setRole("Doctor");
    setDepartment("Clinical Team");
    setPhone("+1 (555) 019-0000");
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartment(u.department as DepartmentName);
    setPhone(u.phone || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (editingUser) {
      const updated = await apiUserService.updateUser(editingUser.id, {
        name,
        email,
        role,
        department,
        phone,
      });
      if (updated) {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
    } else {
      const created = await apiUserService.createUser({
        name,
        email,
        role,
        department,
        status: "ACTIVE",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        phone,
        password: "password123",
      });
      setUsers((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this staff user?")) {
      await apiUserService.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Hospital Staff & Access Governance</CardTitle>
          <p className="text-xs text-[#607264] mt-1">
            Manage hospital personnel, departmental task queues, and role-based operational permissions
          </p>
        </div>
        <Button onClick={openAddModal} variant="primary" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </Button>
      </CardHeader>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f4f7f4] border-b border-[#e2e8df] text-[#607264] font-mono text-[10px] uppercase">
            <tr>
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Assigned Tasks</th>
              <th className="py-3 px-4">Avg Resolution</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eee6]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#f7f9f6] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="h-8 w-8 rounded-xl object-cover border border-[#d2ddd0]"
                    />
                    <div>
                      <p className="font-bold text-[#142019]">{u.name}</p>
                      <p className="text-[11px] text-[#607264] font-mono">{u.email}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <Badge
                    variant={
                      u.role === "Admin"
                        ? "rose"
                        : u.role === "Doctor"
                        ? "teal"
                        : u.role === "Manager"
                        ? "amber"
                        : "default"
                    }
                    size="sm"
                  >
                    {u.role}
                  </Badge>
                </td>

                <td className="py-3.5 px-4 font-medium text-[#2d3a30]">{u.department}</td>

                <td className="py-3.5 px-4 font-mono">
                  <span className="text-[#059669] font-bold">{u.assignedTasksCount}</span> active /{" "}
                  <span className="text-[#607264]">{u.completedTasksCount} done</span>
                </td>

                <td className="py-3.5 px-4 font-mono text-[#2d3a30]">
                  {u.avgResolutionMinutes} mins
                </td>

                <td className="py-3.5 px-4">
                  <Badge
                    variant={u.status === "active" ? "emerald" : "amber"}
                    size="sm"
                    dot
                  >
                    {u.status}
                  </Badge>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg bg-[#f0f4ef] hover:bg-[#e4ece2] text-[#2d3a30] border border-[#dce5da] transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded-lg bg-[#f0f4ef] hover:bg-[#fee2e2] text-[#607264] hover:text-[#dc2626] border border-[#dce5da] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit Staff Details" : "Add New Staff Member"}
        description="Configure role permissions and department workflow assignment."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Aris Thorne"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="a.thorne@metrohealth.org"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { label: "Admin", value: "Admin" },
                { label: "Doctor", value: "Doctor" },
                { label: "Receptionist", value: "Receptionist" },
                { label: "Insurance Employee", value: "Insurance Employee" },
                { label: "Manager", value: "Manager" },
              ]}
            />

            <Select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentName)}
              options={[
                { label: "Reception", value: "Reception" },
                { label: "Insurance", value: "Insurance" },
                { label: "Customer Support", value: "Customer Support" },
                { label: "Billing", value: "Billing" },
                { label: "Pharmacy", value: "Pharmacy" },
                { label: "Emergency Triage", value: "Emergency Triage" },
                { label: "Clinical Team", value: "Clinical Team" },
              ]}
            />
          </div>

          <Input
            label="Phone Contact"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 019-2831"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e2e8df]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingUser ? "Update Staff" : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
