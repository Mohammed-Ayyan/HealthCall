"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, AlertTriangle, AlertCircle, Clock, Check } from "lucide-react";
import { NotificationItem, NotificationType } from "@/shared/types/notification";
import { mockNotificationsService } from "@/features/platform/mockNotificationsService";
import { Badge } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/utils/cn";

export interface NotificationDropdownProps {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function NotificationDropdown({ onClose, onCountChange }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    const list = await mockNotificationsService.getNotifications(filter);
    setNotifications(list);
    if (onCountChange) {
      onCountChange(mockNotificationsService.getUnreadCount());
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await mockNotificationsService.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAll = async () => {
    await mockNotificationsService.markAllAsRead();
    loadNotifications();
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "critical-call":
        return <AlertCircle className="h-4 w-4 text-[#dc2626]" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-[#d97706]" />;
      case "deadline-missed":
        return <Clock className="h-4 w-4 text-[#d97706]" />;
      case "new-task":
        return <Check className="h-4 w-4 text-[#059669]" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#e2e8df] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#edf2ea] bg-[#fcfdfc]">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#1b4332]" />
          <h4 className="text-xs font-bold text-[#142019] uppercase tracking-wider">
            CareOps Living Alerts
          </h4>
        </div>
        <button
          onClick={handleMarkAll}
          className="flex items-center gap-1 text-[11px] text-[#059669] hover:text-[#1b4332] font-semibold transition-colors cursor-pointer"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[#edf2ea] text-[11px] p-1 bg-[#f7f9f6]">
        {(["all", "critical-call", "escalation", "new-task"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "flex-1 py-1 rounded-lg font-medium capitalize transition-colors text-center cursor-pointer",
              filter === t
                ? "bg-white text-[#1b4332] shadow-2xs font-semibold"
                : "text-[#627267] hover:text-[#142019]"
            )}
          >
            {t === "all" ? "All" : t.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#edf2ea]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No active alerts in this category
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3.5 hover:bg-[#fbfdfb] transition-colors relative group",
                !item.read ? "bg-[#f4f9f5]/70" : "opacity-75"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-[#e2e8df] shadow-2xs flex-shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#142019] truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-[#627267] font-mono whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#4a5a50] mt-1 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          item.priority === "critical"
                            ? "rose"
                            : item.priority === "high"
                            ? "amber"
                            : "teal"
                        }
                        size="sm"
                      >
                        {item.priority}
                      </Badge>
                      {item.patientName && (
                        <span className="text-[10px] text-[#627267] font-mono">
                          {item.patientName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.read && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-[10px] text-[#627267] hover:text-[#1b4332] transition-colors cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                      {item.actionUrl && (
                        <Link
                          href={item.actionUrl}
                          onClick={onClose}
                          className="flex items-center gap-0.5 text-[10px] text-[#059669] hover:underline font-semibold"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#edf2ea] bg-[#fcfdfc] text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-[#627267] hover:text-[#1b4332] transition-colors block py-1 font-medium"
        >
          View Notification History & Rules →
        </Link>
      </div>
    </div>
  );
}
