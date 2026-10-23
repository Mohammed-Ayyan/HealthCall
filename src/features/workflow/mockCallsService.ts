import { Call } from "@/shared/types/call";

// Live calls populated dynamically by Call Simulator, Audio Upload, or Microphone Recording
export const mockCallsList: Call[] = [];

/**
 * Healthcare Call History & Intelligence Service
 * Dynamically tracks calls simulated, uploaded, or recorded live.
 */
export const mockCallsService = {
  async getCalls(filters?: {
    search?: string;
    priority?: string;
    department?: string;
    status?: string;
    intent?: string;
  }): Promise<Call[]> {
    await new Promise((r) => setTimeout(r, 60));
    let calls = [...mockCallsList];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      calls = calls.filter(
        (c) =>
          c.patient?.name?.toLowerCase().includes(q) ||
          c.patient?.mrn?.toLowerCase().includes(q) ||
          c.summary?.overview?.toLowerCase().includes(q) ||
          c.callNumber?.toLowerCase().includes(q)
      );
    }
    if (filters?.priority && filters.priority !== "all") {
      calls = calls.filter((c) => c.priority === filters.priority);
    }
    if (filters?.department && filters.department !== "all") {
      calls = calls.filter(
        (c) => c.assignedDepartment?.toLowerCase() === filters.department?.toLowerCase()
      );
    }
    if (filters?.status && filters.status !== "all") {
      calls = calls.filter((c) => c.status === filters.status);
    }
    if (filters?.intent && filters.intent !== "all") {
      calls = calls.filter((c) => c.intent === filters.intent);
    }

    return calls;
  },

  async getCallById(id: string): Promise<Call | undefined> {
    await new Promise((r) => setTimeout(r, 60));
    return mockCallsList.find((c) => c.id === id);
  },

  async getRecentCalls(limit = 5): Promise<Call[]> {
    await new Promise((r) => setTimeout(r, 40));
    return mockCallsList.slice(0, limit);
  },

  upsertCall(call: Call): Call {
    const idx = mockCallsList.findIndex((c) => c.id === call.id);
    if (idx >= 0) {
      mockCallsList[idx] = call;
    } else {
      mockCallsList.unshift(call);
    }
    return call;
  },
};
