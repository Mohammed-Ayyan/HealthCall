import { Call, ActionExtraction, Commitment, TranscriptSegment } from "@/shared/types/call";

// Realistic live call session currently in progress
export const mockLiveCall: Call = {
  id: "call-live-001",
  callNumber: "CC-2026-9842",
  patient: {
    id: "pat-101",
    name: "Rahul Sharma",
    age: 48,
    gender: "Male",
    phone: "+1 (555) 234-8901",
    mrn: "MRN-884920",
    insuranceProvider: "BlueCross Premier PPO",
  },
  duration: "03:24",
  durationSeconds: 204,
  timestamp: "2026-10-13T11:24:00Z",
  status: "in-progress",
  priority: "high",
  intent: "Appointment Request",
  secondaryIntents: ["Insurance Query"],
  sentiment: "concerned",
  sentimentScore: -0.38,
  summary: {
    overview:
      "Patient Rahul Sharma called following laparoscopic appendectomy performed 5 days ago. Reported persistent low-grade fever (100.8°F) and moderate incision tenderness. Requests urgent follow-up appointment with Dr. Aris Thorne. Also inquired if pending insurance pre-authorization will cover emergency imaging if required.",
    keyPoints: [
      "Surgery completed 5 days ago (laparoscopic appendectomy)",
      "Mild surgical site redness and fever 100.8°F reported",
      "Urgent in-person doctor consultation requested within 24 hours",
      "Insurance prior authorization pending with BlueCross",
    ],
    clinicalFlags: ["Post-Op Fever > 100.4°F", "Surgical Incision Tenderness"],
    insurancePending: true,
    confidenceScore: 0.96,
  },
  transcript: [
    {
      id: "t-1",
      speaker: "agent",
      speakerName: "AI Receptionist (CareOps)",
      text: "Thank you for calling Metro Health Post-Surgical Care. My name is Alex. How may I assist you today?",
      timestamp: "00:04",
      offsetSeconds: 4,
    },
    {
      id: "t-2",
      speaker: "patient",
      speakerName: "Rahul Sharma",
      text: "Hello, I had an appendectomy five days ago with Dr. Thorne. I've developed a fever of 100.8 degrees and the lower incision feels swollen. I really need a follow-up appointment as soon as possible.",
      timestamp: "00:18",
      offsetSeconds: 18,
      sentiment: "concerned",
      highlighted: true,
    },
    {
      id: "t-3",
      speaker: "agent",
      speakerName: "AI Receptionist (CareOps)",
      text: "I understand your concern, Mr. Sharma. Fevers after surgery need prompt attention. I will flag this immediately for Dr. Thorne's surgical triage nurse and check appointment openings for tomorrow morning.",
      timestamp: "00:32",
      offsetSeconds: 32,
    },
    {
      id: "t-4",
      speaker: "patient",
      speakerName: "Rahul Sharma",
      text: "Thank you. Also, BlueCross had a pending pre-auth on my post-op ultrasound. Will I face an out-of-pocket bill if the doctor orders imaging tomorrow?",
      timestamp: "00:54",
      offsetSeconds: 54,
      sentiment: "concerned",
    },
    {
      id: "t-5",
      speaker: "agent",
      speakerName: "AI Receptionist (CareOps)",
      text: "I will submit an expedited insurance review ticket to our billing coordinator right away to confirm authorization. I will call you tomorrow before 10:00 AM with both your confirmed slot and insurance verification.",
      timestamp: "01:15",
      offsetSeconds: 75,
      highlighted: true,
    },
    {
      id: "t-6",
      speaker: "patient",
      speakerName: "Rahul Sharma",
      text: "That would be a huge relief. Please make sure the doctor sees the note about the 100.8 fever. I appreciate your quick help.",
      timestamp: "01:35",
      offsetSeconds: 95,
      sentiment: "neutral",
    },
  ],
  actions: [
    {
      id: "act-101",
      task: "Schedule urgent post-op consultation with Dr. Thorne",
      department: "Reception",
      priority: "high",
      deadline: "Tomorrow 09:00 AM",
      evidenceQuote: "I really need a follow-up appointment as soon as possible... fever of 100.8 degrees.",
      suggestedAssignee: "Sarah Jenkins (Reception Lead)",
      status: "assigned",
    },
    {
      id: "act-102",
      task: "Expedite BlueCross prior-auth verification for post-op imaging",
      department: "Insurance",
      priority: "medium",
      deadline: "Tomorrow 11:00 AM",
      evidenceQuote: "BlueCross had a pending pre-auth on my post-op ultrasound... out-of-pocket bill.",
      suggestedAssignee: "Marcus Vance (Claims Specialist)",
      status: "pending",
    },
    {
      id: "act-103",
      task: "Clinical triage alert: Post-op fever monitoring protocol",
      department: "Clinical Team",
      priority: "critical",
      deadline: "Today within 2 hours",
      evidenceQuote: "I've developed a fever of 100.8 degrees and the lower incision feels swollen.",
      suggestedAssignee: "Nurse Elena Rostova",
      status: "in-progress",
    },
  ],
  commitments: [
    {
      id: "com-1",
      commitment: "Confirm Dr. Thorne appointment slot and call patient tomorrow before 10:00 AM",
      owner: "Reception Team",
      deadline: "Tomorrow 10:00 AM",
      timestamp: "01:15",
      status: "pending",
      evidenceQuote: "I will call you tomorrow before 10:00 AM with both your confirmed slot and insurance verification.",
    },
    {
      id: "com-2",
      commitment: "Submit expedited insurance review ticket to billing coordinator",
      owner: "Insurance & Billing Team",
      deadline: "Today 05:00 PM",
      timestamp: "01:15",
      status: "pending",
      evidenceQuote: "I will submit an expedited insurance review ticket to our billing coordinator right away.",
    },
  ],
  assignedDepartment: "Reception",
  agentName: "CareOps AI Voice Node #4",
  slaRemainingHours: 3.5,
};

let activeLiveCall: Call | null = null;

/**
 * Healthcare Call Intelligence Service
 * Dynamically populated when a call is simulated, recorded, or uploaded.
 */
export const mockCallService = {
  async getLiveCall(): Promise<Call | null> {
    await new Promise((r) => setTimeout(r, 40));
    return activeLiveCall;
  },

  async getCallIntelligence(callId: string): Promise<Call | null> {
    await new Promise((r) => setTimeout(r, 40));
    if (activeLiveCall && callId === activeLiveCall.id) return activeLiveCall;
    return null;
  },

  async extractCommitments(callId: string): Promise<Commitment[]> {
    await new Promise((r) => setTimeout(r, 40));
    return activeLiveCall?.commitments || [];
  },

  async extractActions(callId: string): Promise<ActionExtraction[]> {
    await new Promise((r) => setTimeout(r, 40));
    return activeLiveCall?.actions || [];
  },

  updateLiveCall(updated: Partial<Call>): Call {
    if (!activeLiveCall) {
      activeLiveCall = { ...mockLiveCall, ...updated } as Call;
    } else {
      Object.assign(activeLiveCall, updated);
    }
    return activeLiveCall;
  },

  clearLiveCall(): void {
    activeLiveCall = null;
  },
};

