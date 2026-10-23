"use client";

import React, { useState, useEffect } from "react";
import {
  KanbanSquare,
  Network,
  Clock,
  ShieldAlert,
  UserCheck,
  Plus,
  Filter,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { KanbanBoard } from "@/features/workflow/components/KanbanBoard";
import { SLATrackerCard } from "@/features/workflow/components/SLATrackerCard";
import { DepartmentRoutingUI } from "@/features/workflow/components/DepartmentRoutingUI";
import { EscalationBanner } from "@/features/workflow/components/EscalationBanner";
import { apiTaskService } from "@/features/platform/tasks/apiTaskService";
import { apiDepartmentService } from "@/features/platform/departments/apiDepartmentService";
import { apiUserService } from "@/features/platform/users/apiUserService";
import { ActionItem, DepartmentRoutingRule, TaskStatus } from "@/shared/types/action";
import { User } from "@/shared/types/user";
import { Modal } from "@/shared/components/ui/Modal";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export default function ActionsPage() {
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [routingRules, setRoutingRules] = useState<DepartmentRoutingRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTaskForAssign, setActiveTaskForAssign] = useState<ActionItem | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActionData();
  }, []);

  const loadActionData = async () => {
    setLoading(true);
    try {
      const [actionList, staffList, depts] = await Promise.all([
        apiTaskService.getTasks(),
        apiUserService.getUsers(),
        apiDepartmentService.getDepartments().catch(() => []),
      ]);
      setTasks(actionList);
      setUsers(staffList);

      const dynamicRules: DepartmentRoutingRule[] = (depts || []).map((d) => ({
        intent: `${d.name} Clinical & Operations Dispatch`,
        targetDepartment: (d.name as any) || "Clinical",
        defaultPriority: "medium",
        slaTargetHours: 24,
        autoAssignee: d.leadName || "Department Queue",
      }));
      setRoutingRules(dynamicRules);
    } catch (e: any) {
      console.warn("Error loading actions data:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (task: ActionItem) => {
    setActiveTaskForAssign(task);
    setIsAssignModalOpen(true);
  };

  const handleAssignUser = async (user: User) => {
    if (!activeTaskForAssign) return;
    try {
      const updated = await apiTaskService.assignTask(activeTaskForAssign.id, user.id);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (err: any) {
      console.warn("Failed to assign task:", err.message);
    }
    setIsAssignModalOpen(false);
    setActiveTaskForAssign(null);
  };

  const handleEscalateTask = async (task: ActionItem) => {
    try {
      const updated = await apiTaskService.updateTaskStatus(task.id, "IN_PROGRESS");
      if (updated) {
        updated.isEscalated = true;
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (err: any) {
      console.warn("Failed to escalate task:", err.message);
    }
  };

  const escalatedTasks = tasks.filter((t) => t.isEscalated);

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["Doctor", "Receptionist", "Insurance Employee", "Manager", "Admin"]}
        moduleName="Operational Action Workflows"
      >
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                Operational Action Workflows
              </h1>
              <Badge variant="teal" size="sm">
                Kanban Board
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Autonomous clinical task tracking, department assignments, SLA monitoring, and escalations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              6 Departments Connected
            </Badge>
          </div>
        </div>

        {/* Escalation Alert */}
        {escalatedTasks.length > 0 && <EscalationBanner escalatedTasks={escalatedTasks} />}

        {/* Main Kanban Board */}
        <KanbanBoard
          initialTasks={tasks}
          onAssignTask={handleOpenAssignModal}
          onEscalateTask={handleEscalateTask}
        />

        {/* Bottom SLA Tracker & Routing Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <SLATrackerCard tasks={tasks} />
          </div>
          <div className="lg:col-span-6">
            <DepartmentRoutingUI rules={routingRules} />
          </div>
        </div>

        {/* Employee Assignment Modal */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Staff to Operational Task"
          description={activeTaskForAssign ? `Task: ${activeTaskForAssign.task}` : undefined}
          size="md"
        >
          <div className="space-y-3">
            <p className="text-xs text-[#607264]">
              Select available hospital staff member from {activeTaskForAssign?.department || "relevant"} department:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleAssignUser(u)}
                  className="p-3 rounded-xl bg-white border border-[#e2e8e0] hover:border-[#059669]/60 hover:bg-[#f0fdf4] transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="h-9 w-9 rounded-xl object-cover border border-[#c8e6c9]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#142019] group-hover:text-[#059669] transition-colors">
                        {u.name}
                      </h4>
                      <p className="text-[11px] text-[#607264]">
                        {u.role} • {u.department}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant={u.status === "active" ? "emerald" : "default"} size="sm">
                      {u.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      </div>
      </RoleGuard>
    </AppShell>
  );
}
