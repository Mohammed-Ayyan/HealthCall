"use client";

import React from "react";
import { Bot, User, Clock, AlertTriangle, FileText, Activity, ShieldCheck, Stethoscope } from "lucide-react";
import { DoctorQueuePatient } from "../types";
import { Modal } from "@/shared/components/ui/Modal";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface AIPatientBriefModalProps {
  patient: DoctorQueuePatient | null;
  isOpen: boolean;
  onClose: () => void;
  onStartConsultation?: (patientId: string) => void;
}

export function AIPatientBriefModal({
  patient,
  isOpen,
  onClose,
  onStartConsultation,
}: AIPatientBriefModalProps) {
  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[#142019] font-bold">AI Clinical Brief & Patient Dossier</span>
            <p className="text-xs text-[#627267] font-normal">
              Autonomous clinical extraction prepared prior to consultation
            </p>
          </div>
        </div>
      }
      className="max-w-3xl bg-white border-[#e2e8df] text-[#142019]"
    >
      <div className="space-y-6 pt-2">
        {/* Header patient bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#f7f9f6] border border-[#e2e8df]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#1b4332] text-white flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#142019]">{patient.name}</h3>
                <span className="text-xs font-mono text-[#627267]">
                  {patient.gender}, {patient.age}y
                </span>
                <Badge variant="teal" size="sm" className="font-mono">
                  {patient.mrn}
                </Badge>
              </div>
              <p className="text-xs text-[#627267] mt-0.5">
                Appointment: <span className="font-mono text-[#28382e] font-semibold">{patient.appointmentTime}</span> •{" "}
                <span className="text-[#059669] font-semibold">{patient.roomNumber}</span>
              </p>
            </div>
          </div>
          <Badge
            variant={
              patient.priority === "urgent"
                ? "rose"
                : patient.priority === "high"
                ? "amber"
                : "teal"
            }
          >
            {patient.priority.toUpperCase()} PRIORITY
          </Badge>
        </div>

        {/* AI Summary Highlight Box */}
        <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-[#bbf7d0] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-full bg-[radial-gradient(circle_at_top_right,rgba(5,150,105,0.08),transparent_70%)] pointer-events-none" />
          <div className="flex items-center gap-2 text-xs font-semibold text-[#166534] uppercase tracking-wider mb-2">
            <Bot className="h-4 w-4 text-[#16a34a]" />
            <span>AI Clinical Brief Summary</span>
          </div>
          <p className="text-sm font-semibold text-[#14532d] leading-snug">
            {patient.aiBrief.summary}
          </p>

          {patient.aiBrief.keyVitalsAlert && (
            <div className="mt-3 inline-flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] px-3 py-1.5 rounded-lg text-xs font-mono text-[#b91c1c]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#dc2626]" />
              <span>{patient.aiBrief.keyVitalsAlert}</span>
            </div>
          )}
        </div>

        {/* 3 Solarpunk Structured Points: Previous Conversation, Pending Issue, Required Action */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#627267]">
            Important Clinical Touchpoints
          </h4>

          {/* Point 1: Previous Conversation */}
          <div className="bg-[#fcfdfc] p-4 rounded-xl border border-[#e2e8df]">
            <p className="text-xs font-semibold text-[#1b4332] flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-[#059669]" />
              1. Previous Telephony / Portal Conversation
            </p>
            <p className="text-xs text-[#28382e] leading-relaxed">
              {patient.aiBrief.previousConversation}
            </p>
          </div>

          {/* Point 2: Pending Issue */}
          <div className="bg-[#fcfdfc] p-4 rounded-xl border border-[#e2e8df]">
            <p className="text-xs font-semibold text-[#b45309] flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[#d97706]" />
              2. Pending Issue
            </p>
            <p className="text-xs text-[#28382e] leading-relaxed">
              {patient.aiBrief.pendingIssue}
            </p>
          </div>

          {/* Point 3: Required Action */}
          <div className="bg-[#fcfdfc] p-4 rounded-xl border border-[#e2e8df]">
            <p className="text-xs font-semibold text-[#0f766e] flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-[#0d9488]" />
              3. Required Clinical Action
            </p>
            <p className="text-xs text-[#28382e] leading-relaxed">
              {patient.aiBrief.requiredAction}
            </p>
          </div>
        </div>

        {/* Medical Requests & Follow-up History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#f7f9f6] p-4 rounded-xl border border-[#e2e8df]">
            <p className="text-xs font-semibold text-[#142019] mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#059669]" />
              Active Medical Requests
            </p>
            <div className="space-y-2">
              {patient.medicalRequests.map((req) => (
                <div key={req.id} className="text-xs bg-white p-2.5 rounded-lg border border-[#e2e8df] flex items-center justify-between">
                  <span className="text-[#28382e] font-medium">{req.title}</span>
                  <Badge variant="amber" size="sm">{req.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#f7f9f6] p-4 rounded-xl border border-[#e2e8df]">
            <p className="text-xs font-semibold text-[#142019] mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#0d9488]" />
              Recent Follow-up History
            </p>
            <div className="space-y-2">
              {patient.followupHistory.map((fu, idx) => (
                <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-[#e2e8df]">
                  <div className="flex items-center justify-between text-[11px] text-[#627267] mb-1">
                    <span>{fu.date}</span>
                    <span className="text-[#142019] font-medium">{fu.doctor}</span>
                  </div>
                  <p className="text-[#4a5a50] text-[11px] leading-snug">{fu.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#edf2ea]">
          <Button variant="outline" onClick={onClose}>
            Close Dossier
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (onStartConsultation) onStartConsultation(patient.id);
              onClose();
            }}
          >
            Open Clinical Chart & Enter Room
          </Button>
        </div>
      </div>
    </Modal>
  );
}
