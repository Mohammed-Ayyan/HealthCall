"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle2, UserCheck, ArrowUpRight, ShieldAlert, ArrowRight } from "lucide-react";
import { EscalationCase } from "../types";
import { managerService } from "../services/managerService";
import { apiUserService } from "@/features/platform/users/apiUserService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Select } from "@/shared/components/ui/Input";

export interface EscalationManagerCardProps {
  initialEscalations: EscalationCase[];
}

export function EscalationManagerCard({ initialEscalations }: EscalationManagerCardProps) {
  const [escalations, setEscalations] = useState<EscalationCase[]>(initialEscalations);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationCase | null>(null);
  const [staffList, setStaffList] = useState<{ label: string; value: string }[]>([]);
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<EscalationCase["priority"]>("Urgent");

  useEffect(() => {
    async function loadStaff() {
      try {
        const users = await apiUserService.getUsers();
        const nonPatients = users.filter((u) => u.role !== "Patient");
        if (nonPatients.length > 0) {
          const mapped = nonPatients.map((u) => ({
            label: `${u.name} (${u.role}${u.department ? ` • ${u.department}` : ""})`,
            value: u.name,
          }));
          setStaffList(mapped);
          setNewAssignee(mapped[0].value);
        }
      } catch (err) {
        console.warn("Could not load staff list:", err);
      }
    }
    loadStaff();
  }, []);

  const handleResolve = async (id: string) => {
    await managerService.resolveEscalation(id);
    setEscalations(
      escalations.map((e) => (e.id === id ? { ...e, status: "Resolved" } : e))
    );
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalation) return;
    await managerService.reassignEscalation(selectedEscalation.id, newAssignee);
    await managerService.updateEscalationPriority(selectedEscalation.id, newPriority);
    setEscalations(
      escalations.map((e) =>
        e.id === selectedEscalation.id
          ? { ...e, assignedTo: newAssignee, priority: newPriority, status: "Reassigned" }
          : e
      )
    );
    setSelectedEscalation(null);
  };

  return (
    <>
      <Card className="bg-white border-[#e2e8df] shadow-sm">
        <CardHeader className="border-b border-[#edf2ea] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-[#142019]">Escalation & SLA Incident Command</CardTitle>
                <p className="text-xs text-[#627267] mt-0.5">
                  Overdue commitments, clinical approvals, and urgent patient speech triggers
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#dc2626] bg-[#fef2f2] px-3 py-1 rounded-full border border-[#fecaca]">
              {escalations.filter((e) => e.status !== "Resolved").length} Active Incidents
            </span>
          </div>
        </CardHeader>

        <div className="divide-y divide-[#edf2ea]">
          {escalations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#627267]">
              No active escalations. Department operating within SLA.
            </div>
          ) : (
            escalations.map((esc) => (
            <div
              key={esc.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{esc.patientName}</h4>
                    <span className="text-xs font-mono text-[#627267]">({esc.callId})</span>
                    <Badge variant={esc.priority === "Urgent" ? "rose" : "amber"} size="sm">
                      {esc.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="teal" size="sm">
                      {esc.type}
                    </Badge>
                    <Badge
                      variant={esc.status === "Resolved" ? "emerald" : "default"}
                      size="sm"
                    >
                      {esc.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#28382e] font-medium mt-1.5">{esc.issue}</p>

                  <div className="flex items-center gap-4 text-xs text-[#627267] mt-2 font-mono flex-wrap">
                    <span className="text-[#dc2626] font-semibold bg-[#fef2f2] px-2 py-0.5 rounded border border-[#fecaca]">
                      Overdue: {esc.overdueBy}
                    </span>
                    <span>•</span>
                    <span className="text-[#28382e]">Assignee: {esc.assignedTo}</span>
                  </div>
                </div>
              </div>

              {/* Assignment Control Buttons */}
              <div className="flex items-center gap-2.5 self-end lg:self-center">
                {esc.status !== "Resolved" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEscalation(esc);
                        setNewAssignee(esc.assignedTo);
                        setNewPriority(esc.priority);
                      }}
                      className="border-[#dce8df] text-[#28382e] hover:text-[#1b4332] flex items-center gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Reassign / Prioritize</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolve(esc.id)}
                      className="flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolve</span>
                    </Button>
                  </>
                ) : (
                  <span className="text-xs font-mono text-[#059669] bg-[#f0fdf4] px-3 py-1.5 rounded-lg border border-[#bbf7d0]">
                    Incident Cleared
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </Card>

      {/* Reassign & Priority Control Modal */}
      {selectedEscalation && (
        <Modal
          isOpen={!!selectedEscalation}
          onClose={() => setSelectedEscalation(null)}
          title={`Escalation Control • ${selectedEscalation.patientName}`}
          className="max-w-md bg-white border-[#e2e8df]"
        >
          <form onSubmit={handleReassignSubmit} className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-[#142019] font-semibold mb-1">Issue Overview</p>
              <p className="text-xs text-[#28382e] bg-[#f7f9f6] p-2.5 rounded-xl border border-[#e2e8df]">
                {selectedEscalation.issue}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Assign Employee
              </label>
              <Select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                options={
                  staffList.length > 0
                    ? staffList
                    : [{ label: "No personnel available", value: "" }]
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Urgency / Priority Tier
              </label>
              <Select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as EscalationCase["priority"])}
                options={[
                  { label: "Urgent (Immediate Dispatch)", value: "Urgent" },
                  { label: "High (Within 1 Hour)", value: "High" },
                  { label: "Medium (Within Shift)", value: "Medium" },
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#edf2ea]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedEscalation(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
