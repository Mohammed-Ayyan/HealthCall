import { NotificationItem, NotificationType } from "@/shared/types/notification";

let notificationsStore: NotificationItem[] = [];

/**
 * Future backend replacement: src/features/platform/apiNotificationsService.ts
 */
export const mockNotificationsService = {
  async getNotifications(typeFilter?: NotificationType | "all"): Promise<NotificationItem[]> {
    await new Promise((r) => setTimeout(r, 40));
    if (!typeFilter || typeFilter === "all") return [...notificationsStore];
    return notificationsStore.filter((n) => n.type === typeFilter);
  },

  async markAsRead(id: string): Promise<void> {
    const item = notificationsStore.find((n) => n.id === id);
    if (item) item.read = true;
  },

  async markAllAsRead(): Promise<void> {
    notificationsStore.forEach((n) => (n.read = true));
  },

  getUnreadCount(): number {
    return notificationsStore.filter((n) => !n.read).length;
  },
};
