import { CallPriority } from "./call";

export type NotificationType =
  | "new-task"
  | "critical-call"
  | "deadline-missed"
  | "escalation";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: CallPriority;
  timestamp: string;
  read: boolean;
  relatedCallId?: string;
  relatedTaskId?: string;
  patientName?: string;
  actionUrl?: string;
}
