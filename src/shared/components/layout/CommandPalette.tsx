"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  PhoneCall,
  User,
  KanbanSquare,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { mockCallsList } from "@/features/workflow/mockCallsService";
import { apiTaskService } from "@/features/platform/tasks/apiTaskService";
import { ActionItem } from "@/shared/types/action";
import { apiUserService } from "@/features/platform/users/apiUserService";
import { User as UserType } from "@/shared/types/user";
import { apiInsuranceService } from "@/features/platform/insurance/apiInsuranceService";
import { InsuranceClaim } from "@/features/insurance/types";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      apiUserService.getUsers().then((u) => setUsers(u || [])).catch(() => {});
      apiTaskService.getTasks().then((t) => setActions(t || [])).catch(() => {});
      apiInsuranceService.getClaims().then((c) => setClaims(c || [])).catch(() => {});
    }
  }, [isOpen]);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const q = query.toLowerCase().trim();

  const filteredCalls = q
    ? mockCallsList.filter(
        (c) =>
          c.patient.name.toLowerCase().includes(q) ||
          c.callNumber.toLowerCase().includes(q) ||
          c.patient.mrn.toLowerCase().includes(q) ||
          c.intent.toLowerCase().includes(q)
      )
    : mockCallsList.slice(0, 2);

  const filteredActions = q
    ? actions.filter(
        (a) =>
          a.task.toLowerCase().includes(q) ||
          a.patientName.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q)
      )
    : actions.slice(0, 2);

  const filteredClaims = q
    ? claims.filter(
        (c) =>
          c.claimId.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.payerName.toLowerCase().includes(q)
      )
    : claims.slice(0, 2);

  const filteredUsers = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
      )
    : users.slice(0, 4);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="!p-0 overflow-hidden bg-white border-[#e2e8df] shadow-2xl text-[#142019]"
    >
      {/* Search Header Input */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#edf2ea] bg-[#fcfdfc]">
        <Search className="h-5 w-5 text-[#059669] flex-shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients, doctors, employees, calls, tasks, claims..."
          className="w-full bg-transparent text-sm text-[#142019] placeholder:text-[#94a399] focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-xs text-[#627267] hover:text-[#142019] font-mono px-2 py-0.5 rounded bg-[#f4f7f4] cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Box */}
      <div className="max-h-96 overflow-y-auto p-3 space-y-4">
        {/* Calls Section */}
        {filteredCalls.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-[#627267]">
              <PhoneCall className="h-3 w-3 text-[#059669]" />
              <span>Calls & Patient Intelligence</span>
            </div>
            {filteredCalls.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(`/calls/${c.id}`)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f4f8f5] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center font-mono text-xs font-bold">
                    {c.callNumber.slice(-4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#142019] group-hover:text-[#1b4332] transition-colors">
                        {c.patient.name}
                      </span>
                      <span className="text-[10px] text-[#627267] font-mono">{c.patient.mrn}</span>
                      <Badge variant={c.priority === "critical" ? "rose" : c.priority === "high" ? "amber" : "teal"} size="sm">
                        {c.priority}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#627267] truncate max-w-md">
                      {c.intent} • {c.summary.overview}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#94a399] group-hover:text-[#1b4332] transition-colors opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* Action Items Section */}
        {filteredActions.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-[#627267]">
              <KanbanSquare className="h-3 w-3 text-[#0d9488]" />
              <span>Operational Tasks & Commitments</span>
            </div>
            {filteredActions.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelect(`/actions`)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f4f8f5] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#ccfbf1] text-[#0d9488] flex items-center justify-center font-mono text-xs font-bold">
                    TSK
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#142019] group-hover:text-[#0d9488] transition-colors">
                        {a.task}
                      </span>
                      <Badge variant="teal" size="sm">
                        {a.department}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#627267]">
                      Patient: {a.patientName} • Due: {a.deadline} • Status: {a.status}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#94a399] group-hover:text-[#0d9488] transition-colors opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* Insurance Claims Section */}
        {filteredClaims.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-[#627267]">
              <ShieldCheck className="h-3 w-3 text-[#d97706]" />
              <span>Insurance Claims & Prior-Auth</span>
            </div>
            {filteredClaims.map((clm) => (
              <button
                key={clm.id}
                onClick={() => handleSelect(`/insurance/dashboard`)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f4f8f5] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center font-mono text-xs font-bold">
                    CLM
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#142019] group-hover:text-[#d97706] transition-colors">
                        {clm.claimId} • {clm.patientName}
                      </span>
                      <Badge variant="amber" size="sm">
                        {clm.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#627267]">
                      Carrier: {clm.payerName} • Amount: {clm.amount} • Deadline: {clm.deadline}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#94a399] group-hover:text-[#d97706] transition-colors opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* Staff & Clinicians Section */}
        {filteredUsers.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold tracking-wider text-[#627267]">
              <User className="h-3 w-3 text-[#059669]" />
              <span>Hospital Staff & Doctors</span>
            </div>
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(`/profile`)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f4f8f5] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="h-8 w-8 rounded-lg object-cover border border-[#e2e8df]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#142019] group-hover:text-[#1b4332] transition-colors">
                      {u.name}
                    </p>
                    <p className="text-[11px] text-[#627267]">
                      {u.role} • {u.department}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#94a399] group-hover:text-[#1b4332] transition-colors opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer shortcut hints */}
      <div className="px-4 py-2.5 bg-[#f7f9f6] border-t border-[#edf2ea] flex items-center justify-between text-[11px] text-[#627267] font-mono">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#dce8df] text-[#28382e]">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#dce8df] text-[#28382e]">Enter</kbd> Select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#dce8df] text-[#28382e]">ESC</kbd> Close
          </span>
        </div>
        <span className="text-[#059669] font-semibold">CareOps Universal Search</span>
      </div>
    </Modal>
  );
}
