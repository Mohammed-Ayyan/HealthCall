"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  CalendarPlus,
  AlertCircle,
  XCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { PatientAppointment } from "../types";
import { patientService } from "../services/patientService";
import { apiDoctorService, Doctor } from "@/features/platform/doctors/apiDoctorService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input, Select } from "@/shared/components/ui/Input";

export interface AppointmentManagerProps {
  initialAppointments: PatientAppointment[];
  onAppointmentsChange?: () => void;
  className?: string;
}

export function AppointmentManager({
  initialAppointments,
  onAppointmentsChange,
  className,
}: AppointmentManagerProps) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>(initialAppointments);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);

  // Dynamic doctor roster from database
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Form states
  const [doctorName, setDoctorName] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [consultType, setConsultType] = useState<PatientAppointment["type"]>("In-Person Consultation");

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  useEffect(() => {
    setAppointments(initialAppointments);
  }, [initialAppointments]);

  useEffect(() => {
    async function fetchDoctors() {
      setLoadingDoctors(true);
      try {
        const docs = await apiDoctorService.getDoctors();
        if (docs && docs.length > 0) {
          setAvailableDoctors(docs);
          setDoctorName(docs[0].name);
        }
      } catch (err) {
        console.error("Failed to load doctor roster from database", err);
      } finally {
        setLoadingDoctors(false);
      }
    }
    fetchDoctors();
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = availableDoctors.find((d) => d.name === doctorName);
    const created = await patientService.requestAppointment({
      doctorName,
      doctorSpecialty: chosen ? chosen.specialization || chosen.department : "General Care",
      date: preferredDate,
      time: preferredTime,
      location: "Pavilion 3 (Metro Health)",
      type: consultType,
      instructions: "Please arrive 15 minutes before scheduled slot.",
    });
    setAppointments([created, ...appointments]);
    setIsRequestModalOpen(false);
    if (onAppointmentsChange) onAppointmentsChange();
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAptId) return;
    await patientService.rescheduleAppointment(selectedAptId, rescheduleDate, rescheduleTime);
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === selectedAptId
          ? { ...a, date: rescheduleDate, time: rescheduleTime, status: "rescheduled" }
          : a
      )
    );
    setIsRescheduleModalOpen(false);
    setSelectedAptId(null);
    if (onAppointmentsChange) onAppointmentsChange();
  };

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this appointment request?")) {
      await patientService.cancelAppointment(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
      if (onAppointmentsChange) onAppointmentsChange();
    }
  };

  return (
    <Card className={`bg-white border-[#e2e8df] shadow-sm ${className || ""}`}>
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-[#142019]">Appointment Schedule & Consultations</CardTitle>
            <p className="text-xs text-[#627267] mt-0.5">
              Review confirmed doctor visits, post-op reviews, and request new consultations
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsRequestModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          <span>Request Appointment</span>
        </Button>
      </CardHeader>

      <div className="p-5 space-y-3">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="p-4 rounded-xl bg-[#fcfdfc] border border-[#e2e8df] hover:border-[#1b4332]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#142019]">{apt.doctorName}</span>
                <span className="text-xs text-[#627267]">• {apt.doctorSpecialty}</span>
                <Badge
                  variant={
                    apt.status === "confirmed"
                      ? "emerald"
                      : apt.status === "rescheduled"
                      ? "amber"
                      : apt.status === "cancelled"
                      ? "rose"
                      : "teal"
                  }
                  size="sm"
                  dot={apt.status === "confirmed"}
                >
                  {apt.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#4a5a50]">
                <span className="flex items-center gap-1.5 text-[#059669]">
                  <Calendar className="h-3.5 w-3.5" />
                  Date: <strong className="font-bold">{apt.date}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-[#d97706]">
                  <Clock className="h-3.5 w-3.5" />
                  Time: <strong className="font-bold">{apt.time}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-[#627267]">
                  <MapPin className="h-3.5 w-3.5 text-[#94a399]" />
                  {apt.location}
                </span>
              </div>

              {apt.instructions && (
                <p className="text-[11px] text-[#627267] pt-1 italic">
                  Note: {apt.instructions}
                </p>
              )}
            </div>

            {/* Actions: Reschedule & Cancel */}
            {apt.status !== "cancelled" && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedAptId(apt.id);
                    setIsRescheduleModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#f4f8f5] hover:bg-[#e8f0e8] text-[#1b4332] border border-[#d6e2d7] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reschedule</span>
                </button>
                <button
                  onClick={() => handleCancel(apt.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#fff5f5] hover:bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <XCircle className="h-3 w-3" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Request Appointment Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Doctor Appointment"
        description="Submit a preferred time slot to the hospital triage desk."
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <Select
            label="Doctor & Department"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            options={
              availableDoctors.length > 0
                ? availableDoctors.map((d) => ({
                    label: `${d.name} (${d.department || d.specialization || "Clinical Team"})`,
                    value: d.name,
                  }))
                : [{ label: "Loading registered doctors...", value: "" }]
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preferred Date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              placeholder="e.g. 18 October"
              required
            />
            <Input
              label="Preferred Time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="e.g. 11:00 AM"
              required
            />
          </div>

          <Select
            label="Consultation Format"
            value={consultType}
            onChange={(e) => setConsultType(e.target.value as PatientAppointment["type"])}
            options={[
              { label: "In-Person Consultation", value: "In-Person Consultation" },
              { label: "Post-Op Wound Check", value: "Post-Op Wound Check" },
              { label: "Telehealth Video Review", value: "Telehealth Review" },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#edf2ea]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        description="Select a new preferred date and time for your consultation."
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              placeholder="e.g. 19 October"
              required
            />
            <Input
              label="New Time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              placeholder="e.g. 03:00 PM"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#edf2ea]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRescheduleModalOpen(false)}
            >
              Back
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
