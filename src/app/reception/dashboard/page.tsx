"use client";

import React, { useEffect, useState } from "react";
import { receptionService } from "@/features/reception/services/receptionService";
import {
  ReceptionOverviewData,
  ReceptionAppointment,
  ReceptionCallAction,
  DirectoryPatient,
  DoctorScheduleSlot,
} from "@/features/reception/types";
import { ReceptionOverviewCards } from "@/features/reception/components/ReceptionOverviewCards";
import { AppointmentQueueList } from "@/features/reception/components/AppointmentQueueList";
import { CallActionQueue } from "@/features/reception/components/CallActionQueue";
import { PatientDirectory } from "@/features/reception/components/PatientDirectory";
import { AppointmentCalendarView } from "@/features/reception/components/AppointmentCalendarView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/Tabs";
import { Calendar, Bot, Users, CalendarDays } from "lucide-react";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function ReceptionDashboardPage() {
  const [overview, setOverview] = useState<ReceptionOverviewData | null>(null);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [callActions, setCallActions] = useState<ReceptionCallAction[]>([]);
  const [patients, setPatients] = useState<DirectoryPatient[]>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, apts, cas, pats, docs] = await Promise.all([
          receptionService.getOverview(),
          receptionService.getAppointments(),
          receptionService.getCallActions(),
          receptionService.getPatientDirectory(),
          receptionService.getDoctorSchedules(),
        ]);
        setOverview(ov);
        setAppointments(apts);
        setCallActions(cas);
        setPatients(pats);
        setDoctorSchedules(docs);
      } catch (err) {
        console.error("Failed to load reception dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#1b4332] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#1b4332]">Connecting to Front Desk Operations Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Receptionist", "Manager", "Admin"]} moduleName="Reception & Intake Gateway">
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          {/* 1. Front Desk Overview Cards */}
          <ReceptionOverviewCards overview={overview} />

          {/* 2. Operations Tabs */}
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="bg-[#edf2ea] border border-[#d8e2d6] p-1 rounded-xl">
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Calendar className="h-4 w-4" />
                Appointment Queue ({appointments.length})
              </TabsTrigger>
              <TabsTrigger
                value="call-actions"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Bot className="h-4 w-4" />
                AI Call Actions ({callActions.length})
              </TabsTrigger>
              <TabsTrigger
                value="directory"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Users className="h-4 w-4" />
                Patient Directory ({patients.length})
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <CalendarDays className="h-4 w-4" />
                Provider Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="mt-6">
              <AppointmentQueueList initialAppointments={appointments} />
            </TabsContent>

            <TabsContent value="call-actions" className="mt-6">
              <CallActionQueue initialCallActions={callActions} />
            </TabsContent>

            <TabsContent value="directory" className="mt-6">
              <PatientDirectory initialPatients={patients} />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <AppointmentCalendarView
                doctorSchedules={doctorSchedules}
                appointments={appointments}
              />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
