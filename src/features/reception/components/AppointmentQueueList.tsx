"use client";

import React, { useState } from "react";
import { Calendar, User, Clock, CheckCircle2, XCircle, Filter, Plus } from "lucide-react";
import { ReceptionAppointment } from "../types";
import { receptionService } from "../services/receptionService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";

export interface AppointmentQueueListProps {
  initialAppointments: ReceptionAppointment[];
  onAppointmentsChange?: () => void;
}

export function AppointmentQueueList({ initialAppointments }: AppointmentQueueListProps) {
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>(initialAppointments);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");

  const handleStatusChange = async (id: string, status: ReceptionAppointment["status"]) => {
    await receptionService.updateAppointmentStatus(id, status);
    setAppointments(
      appointments.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const filteredAppointments = appointments.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Reception Appointment Queue</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Front desk intake queue, phone triage reservations, and direct cancellations
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#f7f9f6] p-1 rounded-xl border border-[#e2e8df]">
            {(["all", "pending", "confirmed", "cancelled"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all capitalize cursor-pointer ${
                  filter === mode
                    ? "bg-white text-[#1b4332] shadow-xs font-semibold"
                    : "text-[#627267] hover:text-[#142019]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No appointments found matching "{filter}".
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#f4f8f5] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-xs font-bold">
                  {apt.time.split(" ")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{apt.patientName}</h4>
                    <span className="text-xs font-mono text-[#627267]">({apt.mrn})</span>
                    <Badge
                      variant={
                        apt.status === "confirmed"
                          ? "emerald"
                          : apt.status === "pending"
                          ? "amber"
                          : "rose"
                      }
                      size="sm"
                    >
                      {apt.status.toUpperCase()}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {apt.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#28382e] mt-1">
                    Doctor: <span className="text-[#142019] font-semibold">{apt.doctorName}</span> •{" "}
                    <span className="text-[#627267]">{apt.department}</span>
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-[#627267] mt-1 bg-[#f7f9f6] p-2 rounded-lg border border-[#e2e8df] max-w-2xl">
                      {apt.notes}
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-[#059669] mt-1.5 font-semibold">
                    {apt.date} at {apt.time}
                  </p>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 self-end lg:self-center">
                {apt.status === "pending" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange(apt.id, "confirmed")}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm Slot</span>
                  </Button>
                )}

                {apt.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(apt.id, "cancelled")}
                    className="border-[#fecaca] text-[#dc2626] hover:bg-[#fff5f5] flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </Button>
                )}

                {apt.status === "cancelled" && (
                  <span className="text-xs font-mono text-[#94a399] bg-[#f7f9f6] px-3 py-1.5 rounded-lg border border-[#e2e8df]">
                    Archived Cancellation
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
