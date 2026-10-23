"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Clock,
  Check,
  ExternalLink,
  Filter,
} from "lucide-react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { mockNotificationsService } from "@/features/platform/mockNotificationsService";
import { NotificationItem, NotificationType } from "@/shared/types/notification";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/shared/utils/cn";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationType | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [activeFilter]);

  const loadNotifications = async () => {
    setLoading(true);
    const list = await mockNotificationsService.getNotifications(activeFilter);
    setNotifications(list);
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await mockNotificationsService.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await mockNotificationsService.markAllAsRead();
    loadNotifications();
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "critical-call":
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "deadline-missed":
        return <Clock className="h-4 w-4 text-orange-400" />;
      case "new-task":
        return <Check className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e2e8e0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1b4332] font-mono">
                Notification & Alert Center
              </h1>
              <Badge variant="teal" size="sm">
                Triage Inbox
              </Badge>
            </div>
            <p className="text-xs text-[#607264] mt-1">
              Real-time alerts for critical patient cases, SLA thresholds, and supervisor escalations
            </p>
          </div>

          <Button onClick={handleMarkAllAsRead} variant="secondary" size="sm" className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark All as Read</span>
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white border border-[#e2e8e0] shadow-sm">
          <Filter className="h-4 w-4 text-[#059669] ml-1" />
          <span className="text-xs font-semibold text-[#607264] mr-2">Filter Type:</span>
          {(
            [
              { id: "all", label: "All Alerts" },
              { id: "critical-call", label: "Critical Calls" },
              { id: "escalation", label: "Escalations" },
              { id: "deadline-missed", label: "Deadline Warnings" },
              { id: "new-task", label: "New Tasks" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveFilter(t.id)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                activeFilter === t.id
                  ? "bg-[#e8f5e9] text-[#1b4332] border border-[#c8e6c9] font-bold"
                  : "bg-[#f7f9f6] text-[#607264] hover:text-[#142019] hover:bg-[#edf2ec] border border-transparent"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <Card className="divide-y divide-[#edf2ec] !p-0 overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8fa394]">
              No notifications in this category.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id)}
                className={cn(
                  "p-4 flex items-start justify-between gap-4 transition-colors hover:bg-[#f7f9f6] cursor-pointer",
                  !n.read && "bg-[#f0fdf4]/50"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 rounded-xl bg-white border border-[#e2e8e0] shadow-2xs">
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#142019]">{n.title}</h4>
                      <Badge
                        variant={
                          n.priority === "critical"
                            ? "rose"
                            : n.priority === "high"
                            ? "amber"
                            : "teal"
                        }
                        size="sm"
                      >
                        {n.priority}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#4a5f52] leading-relaxed max-w-2xl">{n.message}</p>

                    {n.patientName && (
                      <p className="text-[11px] text-[#607264] font-mono">
                        Patient: <strong className="text-[#142019]">{n.patientName}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[11px] text-[#8fa394] font-mono">{n.timestamp}</span>

                  <div className="flex items-center gap-2">
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#059669] hover:underline"
                      >
                        <span>Open item</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}

                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </AppShell>
  );
}
