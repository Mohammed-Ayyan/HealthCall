"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Stethoscope } from "lucide-react";
import { DoctorScheduleSlot, ReceptionAppointment } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface AppointmentCalendarViewProps {
  doctorSchedules: DoctorScheduleSlot[];
  appointments: ReceptionAppointment[];
}

export function AppointmentCalendarView({
  doctorSchedules,
  appointments,
}: AppointmentCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const days = [
    { label: "Wednesday", date: "15 Oct", active: true },
    { label: "Thursday", date: "16 Oct", active: false },
    { label: "Friday", date: "17 Oct", active: false },
    { label: "Saturday", date: "18 Oct", active: false },
    { label: "Sunday", date: "19 Oct", active: false },
    { label: "Monday", date: "20 Oct", active: false },
    { label: "Tuesday", date: "21 Oct", active: false },
  ];

  const getAvailabilityBadge = (status: DoctorScheduleSlot["availability"]) => {
    switch (status) {
      case "Available":
        return <Badge variant="emerald">AVAILABLE</Badge>;
      case "In Surgery":
        return <Badge variant="amber">IN SURGERY</Badge>;
      case "Fully Booked":
        return <Badge variant="rose">BOOKED</Badge>;
      default:
        return <Badge variant="default">ON BREAK</Badge>;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">CareOps Dynamic Scheduling Matrix</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Hospital-wide provider calendars, real-time operating room status, and open clinic slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#f7f9f6] p-1 rounded-xl border border-[#e2e8df] flex items-center gap-1">
              <button
                onClick={() => setViewMode("daily")}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === "daily"
                    ? "bg-white text-[#1b4332] shadow-xs font-semibold"
                    : "text-[#627267] hover:text-[#142019]"
                }`}
              >
                Daily View
              </button>
              <button
                onClick={() => setViewMode("weekly")}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === "weekly"
                    ? "bg-white text-[#1b4332] shadow-xs font-semibold"
                    : "text-[#627267] hover:text-[#142019]"
                }`}
              >
                Weekly View
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector Strip */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {days.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-left border transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#e8f3ec] border-[#1b4332] text-[#1b4332] shadow-xs"
                    : "bg-[#fcfdfc] border-[#e2e8df] text-[#627267] hover:text-[#142019]"
                }`}
              >
                <span className="block text-[11px] font-mono uppercase font-semibold">{day.label}</span>
                <span className="block text-xs font-bold text-[#142019] mt-0.5">{day.date}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <div className="p-5 space-y-6">
        {/* Clinician Availability Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#627267] uppercase tracking-wider mb-3">
            Doctor Availability & Direct Slots ({days[selectedDayIndex].date})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorSchedules.map((doc) => (
              <div
                key={doc.doctorName}
                className="bg-[#fcfdfc] p-4 rounded-xl border border-[#e2e8df] flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#142019]">{doc.doctorName}</p>
                      <p className="text-xs text-[#627267]">{doc.specialty}</p>
                    </div>
                  </div>
                  {getAvailabilityBadge(doc.availability)}
                </div>

                <div className="mt-3 pt-3 border-t border-[#edf2ea]">
                  <p className="text-[11px] font-mono text-[#627267] mb-1.5">Open Booking Windows:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {doc.availableSlots.length > 0 ? (
                      doc.availableSlots.map((slot) => (
                        <span
                          key={slot}
                          className="text-xs font-mono font-semibold text-[#1b4332] bg-[#e8f3ec] px-2.5 py-1 rounded-md border border-[#cbe2d1]"
                        >
                          {slot}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#94a399] italic">No slots available for this day</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Appointments for Selected Day */}
        <div className="pt-4 border-t border-[#edf2ea]">
          <h3 className="text-xs font-semibold text-[#627267] uppercase tracking-wider mb-3">
            Scheduled Sessions ({appointments.length} Blocked)
          </h3>
          <div className="space-y-2">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="bg-[#fcfdfc] p-3 rounded-xl border border-[#e2e8df] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#059669] font-bold">{a.time}</span>
                  <span className="text-[#142019] font-medium">{a.patientName}</span>
                  <span className="text-[#627267]">• {a.doctorName}</span>
                </div>
                <Badge variant={a.status === "confirmed" ? "emerald" : "amber"} size="sm">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
