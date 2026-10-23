"use client";

import React from "react";
import { Bell, CalendarCheck, Clock, ShieldAlert, Sparkles, Check } from "lucide-react";
import { PatientNotification } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export interface PatientNotificationsListProps {
  notifications: PatientNotification[];
}

export function PatientNotificationsList({ notifications }: PatientNotificationsListProps) {
  const getIcon = (type: PatientNotification["type"]) => {
    switch (type) {
      case "appointment":
        return <CalendarCheck className="h-4 w-4 text-[#059669]" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-[#0d9488]" />;
      case "insurance":
        return <ShieldAlert className="h-4 w-4 text-[#d97706]" />;
      default:
        return <Bell className="h-4 w-4 text-[#627267]" />;
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Patient Alerts & Updates</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Real-time dispatch from hospital clinics, doctors, and billing specialists
              </p>
            </div>
          </div>
          <Badge variant="emerald" size="sm">
            {notifications.filter((n) => !n.read).length} Unread
          </Badge>
        </div>
      </CardHeader>

      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#627267]">
            No unread alerts or notifications.
          </div>
        ) : (
          notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
              notif.read
                ? "bg-[#fcfdfc] border-[#edf2ea] text-[#627267]"
                : "bg-[#f4f9f5] border-[#d6e5da] text-[#142019] shadow-2xs"
            }`}
          >
            <div className="mt-0.5 h-7 w-7 rounded-lg bg-white border border-[#e2e8df] flex items-center justify-center flex-shrink-0 shadow-2xs">
              {getIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#142019] truncate">{notif.title}</h4>
                <span className="text-[11px] font-mono text-[#94a399] whitespace-nowrap">
                  {notif.timestamp}
                </span>
              </div>
              <p className="text-xs text-[#627267] mt-1">{notif.message}</p>
            </div>
          </div>
        ))
      )}
      </div>
    </Card>
  );
}
