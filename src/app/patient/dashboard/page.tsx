"use client";

import React, { useEffect, useState } from "react";
import { patientService } from "@/features/patient/services/patientService";
import {
  PatientOverviewData,
  PatientAppointment,
  PatientRequest,
  CommunicationRecord,
  PatientNotification,
} from "@/features/patient/types";
import { PatientOverviewCards } from "@/features/patient/components/PatientOverviewCards";
import { AppointmentManager } from "@/features/patient/components/AppointmentManager";
import { PatientRequestsTable } from "@/features/patient/components/PatientRequestsTable";
import { CommunicationHistoryList } from "@/features/patient/components/CommunicationHistoryList";
import { PatientNotificationsList } from "@/features/patient/components/PatientNotificationsList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/Tabs";
import { HeartPulse, Calendar, FileText, PhoneCall, Bell } from "lucide-react";
import { RoleGuard } from "@/features/platform/auth/RoleGuard";
import { AppShell } from "@/shared/components/layout/AppShell";

export default function PatientDashboardPage() {
  const [overview, setOverview] = useState<PatientOverviewData | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, apts, reqs, comms, notifs] = await Promise.all([
          patientService.getOverview(),
          patientService.getAppointments(),
          patientService.getRequests(),
          patientService.getCommunicationHistory(),
          patientService.getNotifications(),
        ]);
        setOverview(ov);
        setAppointments(apts);
        setRequests(reqs);
        setCommunications(comms);
        setNotifications(notifs);
      } catch (err) {
        console.error("Failed to load patient portal data", err);
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
          <p className="text-xs font-mono text-[#1b4332]">Connecting to Patient Care Network...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={["Patient", "Admin"]} moduleName="Patient Care Experience Portal">
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
          {/* 1. Overview Cards (Greeting, Next Appointment, Insurance Status, Pending Actions) */}
          <PatientOverviewCards overview={overview} nextAppointment={appointments[0]} />

          {/* 2. Interactive Navigation Tabs for Patient Portal */}
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="bg-[#edf2ea] border border-[#d8e2d6] p-1 rounded-xl">
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Calendar className="h-4 w-4" />
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <FileText className="h-4 w-4" />
                Care Requests ({requests.length})
              </TabsTrigger>
              <TabsTrigger
                value="communications"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <PhoneCall className="h-4 w-4" />
                Call History & AI Summaries
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-white data-[state=active]:text-[#1b4332] data-[state=active]:shadow-sm flex items-center gap-2 text-xs font-semibold"
              >
                <Bell className="h-4 w-4" />
                Updates & Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="mt-6">
              <AppointmentManager initialAppointments={appointments} />
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <PatientRequestsTable requests={requests} />
            </TabsContent>

            <TabsContent value="communications" className="mt-6">
              <CommunicationHistoryList records={communications} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <PatientNotificationsList notifications={notifications} />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGuard>
    </AppShell>
  );
}
