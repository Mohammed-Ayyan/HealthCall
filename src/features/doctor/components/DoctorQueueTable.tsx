"use client";

import React, { useState } from "react";
import { Users, Bot, Stethoscope, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { DoctorQueuePatient } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { AIPatientBriefModal } from "./AIPatientBriefModal";

export interface DoctorQueueTableProps {
  patients: DoctorQueuePatient[];
  onStatusChange?: (patientId: string, newStatus: DoctorQueuePatient["status"]) => void;
}

export function DoctorQueueTable({ patients, onStatusChange }: DoctorQueueTableProps) {
  const [selectedPatient, setSelectedPatient] = useState<DoctorQueuePatient | null>(null);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);

  const handleOpenBrief = (patient: DoctorQueuePatient) => {
    setSelectedPatient(patient);
    setIsBriefModalOpen(true);
  };

  const getPriorityBadge = (priority: DoctorQueuePatient["priority"]) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="rose">URGENT</Badge>;
      case "high":
        return <Badge variant="amber">HIGH</Badge>;
      case "medium":
        return <Badge variant="teal">MEDIUM</Badge>;
      default:
        return <Badge variant="default">ROUTINE</Badge>;
    }
  };

  const getStatusBadge = (status: DoctorQueuePatient["status"]) => {
    switch (status) {
      case "Checked In":
        return <Badge variant="emerald">CHECKED IN</Badge>;
      case "In Consultation":
        return <Badge variant="teal">IN CONSULTATION</Badge>;
      case "Pending Labs":
        return <Badge variant="amber">PENDING LABS</Badge>;
      default:
        return <Badge variant="default">WAITING ROOM</Badge>;
    }
  };

  return (
    <>
      <Card className="bg-white border-[#e2e8df] shadow-sm">
        <CardHeader className="border-b border-[#edf2ea] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-[#142019]">Live Clinical Patient Queue</CardTitle>
                <p className="text-xs text-[#627267] mt-0.5">
                  Real-time arrival sequence with AI-synthesized chief complaints and urgency triage
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-[#1b4332] bg-[#e8f3ec] px-3 py-1 rounded-full border border-[#d2e4d6]">
              {patients.length} In Flow
            </span>
          </div>
        </CardHeader>

        <div className="divide-y divide-[#edf2ea]">
          {patients.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#627267]">
              No scheduled patients in queue today.
            </div>
          ) : (
            patients.map((pat) => (
            <div
              key={pat.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#f4f8f5] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-mono text-xs font-bold">{pat.appointmentTime.split(" ")[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{pat.name}</h4>
                    <span className="text-xs font-mono text-[#627267]">
                      ({pat.gender}, {pat.age}y)
                    </span>
                    <Badge variant="default" size="sm" className="font-mono">
                      {pat.mrn}
                    </Badge>
                    {getPriorityBadge(pat.priority)}
                    {getStatusBadge(pat.status)}
                  </div>
                  <p className="text-xs text-[#28382e] mt-1.5 flex items-center gap-2">
                    <span className="text-[#627267]">Chief Issue:</span>
                    <span className="text-[#142019] font-medium">{pat.issue}</span>
                  </p>
                  <p className="text-[11px] text-[#627267] mt-1">
                    Location: <span className="text-[#059669] font-semibold">{pat.roomNumber}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end lg:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenBrief(pat)}
                  className="border-[#dce8df] text-[#28382e] hover:bg-[#f4f8f5] flex items-center gap-1.5"
                >
                  <Bot className="h-3.5 w-3.5 text-[#059669]" />
                  <span>AI Patient Brief</span>
                </Button>

                {pat.status !== "In Consultation" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (onStatusChange) onStatusChange(pat.id, "In Consultation");
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span>Call Patient</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onStatusChange) onStatusChange(pat.id, "Pending Labs");
                    }}
                    className="border-[#059669] text-[#059669] bg-[#f0fdf4]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Consultation Active</span>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </Card>
      
      <AIPatientBriefModal
        patient={selectedPatient}
        isOpen={isBriefModalOpen}
        onClose={() => setIsBriefModalOpen(false)}
        onStartConsultation={(id) => {
          if (onStatusChange) onStatusChange(id, "In Consultation");
        }}
      />
    </>
  );
}
