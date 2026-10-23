import { AuditEvent } from "@/shared/types/audit";

export const mockCallAuditEvents: Record<string, AuditEvent[]> = {};

/**
 * Healthcare Audit Event Service
 * Dynamically records and serves audit events for live calls and task workflows.
 */
export const mockAuditService = {
  async getAuditTimeline(callId: string): Promise<AuditEvent[]> {
    await new Promise((r) => setTimeout(r, 40));
    return mockCallAuditEvents[callId] || [];
  },

  recordEvent(callId: string, event: AuditEvent): void {
    if (!mockCallAuditEvents[callId]) {
      mockCallAuditEvents[callId] = [];
    }
    mockCallAuditEvents[callId].push(event);
  },

  clearEvents(): void {
    for (const key of Object.keys(mockCallAuditEvents)) {
      delete mockCallAuditEvents[key];
    }
  },
};
