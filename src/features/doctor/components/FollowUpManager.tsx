"use client";

import React, { useState } from "react";
import { Plus, CheckCircle2, Clock, UserCheck, AlertTriangle, FileEdit } from "lucide-react";
import { DoctorFollowUp } from "../types";
import { doctorService } from "../services/doctorService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input, Select } from "@/shared/components/ui/Input";
import { authService } from "@/features/platform/auth/authService";

export interface FollowUpManagerProps {
  initialFollowUps: DoctorFollowUp[];
}

export function FollowUpManager({ initialFollowUps }: FollowUpManagerProps) {
  const [followUps, setFollowUps] = useState<DoctorFollowUp[]>(initialFollowUps);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const currentUser = authService.getCurrentUser();

  // Form states
  const [patientName, setPatientName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [protocol, setProtocol] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentUser?.name || "Attending Clinician");
  const [priority, setPriority] = useState<DoctorFollowUp["priority"]>("medium");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await doctorService.createFollowUp({
      patientId: `pat-${Date.now()}`,
      patientName,
      scheduledDate,
      protocol,
      notes,
      assignedTo,
      priority,
      status: "Pending Clinician Review",
    });
    setFollowUps([created, ...followUps]);
    setIsCreateModalOpen(false);
  };

  const handleStatusChange = async (id: string, status: DoctorFollowUp["status"]) => {
    await doctorService.updateFollowUpStatus(id, status);
    setFollowUps(
      followUps.map((f) => (f.id === id ? { ...f, status } : f))
    );
  };

  return (
    <>
      <Card className="bg-white border-[#e2e8df] shadow-sm">
        <CardHeader className="border-b border-[#edf2ea] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-[#142019]">Follow-up Management & Clinical Tasks</CardTitle>
                <p className="text-xs text-[#627267] mt-0.5">
                  Assigned post-consultation milestones, care protocols, and nursing triage dispatches
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Follow-up</span>
            </Button>
          </div>
        </CardHeader>

        <div className="divide-y divide-[#edf2ea]">
          {followUps.map((fu) => (
            <div
              key={fu.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{fu.patientName}</h4>
                    <Badge variant={fu.priority === "high" ? "amber" : "teal"} size="sm">
                      {fu.priority.toUpperCase()}
                    </Badge>
                    <Badge
                      variant={fu.status === "Completed" ? "emerald" : "default"}
                      size="sm"
                    >
                      {fu.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#28382e] font-medium mt-1">
                    Protocol: <span className="text-[#059669] font-semibold">{fu.protocol}</span>
                  </p>
                  <p className="text-xs text-[#627267] mt-0.5 bg-[#f7f9f6] p-2 rounded-lg border border-[#e2e8df] max-w-2xl">
                    <span className="text-[#142019] font-medium">Notes:</span> {fu.notes}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-[#627267] mt-2 font-mono">
                    <span>Due: {fu.scheduledDate}</span>
                    <span>•</span>
                    <span>Assigned: {fu.assignedTo}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {fu.status !== "Completed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(fu.id, "Completed")}
                    className="border-[#dce8df] text-[#28382e] hover:text-[#1b4332]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] mr-1.5" />
                    <span>Mark Completed</span>
                  </Button>
                ) : (
                  <span className="text-xs font-mono text-[#059669] bg-[#f0fdf4] px-3 py-1.5 rounded-lg border border-[#bbf7d0]">
                    Resolved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Follow-up Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Clinical Follow-up"
        className="max-w-lg bg-white border-[#e2e8df]"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Patient Name
            </label>
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Target Date
              </label>
              <Input
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Priority
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DoctorFollowUp["priority"])}
                options={[
                  { label: "High Priority", value: "high" },
                  { label: "Medium Priority", value: "medium" },
                  { label: "Routine", value: "low" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Care Protocol / Follow-up Title
            </label>
            <Input
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Assignee / Care Team
            </label>
            <Select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              options={[
                { label: `${currentUser?.name || "Attending Clinician"} (Self)`, value: currentUser?.name || "Attending Clinician" },
                { label: "Nurse Triage Unit 2", value: "Nurse Triage Unit 2" },
                { label: "Post-Op Recovery Clinic", value: "Post-Op Recovery Clinic" },
                { label: "Care Coordination Desk", value: "Care Coordination Desk" },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Clinical Instructions / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              className="w-full bg-white border border-[#d8e2d6] text-[#142019] rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 focus:border-[#1b4332]"
            />
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
              Confirm Follow-up
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
