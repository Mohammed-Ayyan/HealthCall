export type CallPriority = "critical" | "high" | "medium" | "low";

export type CallSentiment =
  | "positive"
  | "neutral"
  | "concerned"
  | "frustrated"
  | "angry";

export type CallIntent =
  | "Appointment Request"
  | "Follow-up Request"
  | "Insurance Query"
  | "Complaint"
  | "Billing Issue"
  | "Medicine Refill"
  | "Emergency Concern"
  | "General Inquiry"
  | "Unknown"
  | (string & {});

export type CallStatus = "in-progress" | "analyzed" | "triaged" | "archived";

export interface TranscriptSegment {
  id: string;
  speaker: "agent" | "patient" | "system";
  speakerName: string;
  text: string;
  timestamp: string;
  offsetSeconds: number;
  sentiment?: CallSentiment;
  highlighted?: boolean;
}

export interface AISummary {
  overview: string;
  keyPoints: string[];
  clinicalFlags: string[];
  insurancePending: boolean;
  confidenceScore: number;
}

export interface ActionExtraction {
  id: string;
  task: string;
  department: string;
  priority: CallPriority;
  deadline: string;
  evidenceQuote: string;
  suggestedAssignee?: string;
  status?: "pending" | "assigned" | "in-progress" | "completed";
}

export interface Commitment {
  id: string;
  commitment: string;
  owner: string;
  deadline: string;
  timestamp: string;
  status: "pending" | "in-progress" | "fulfilled" | "escalated";
  evidenceQuote: string;
}

export interface Call {
  id: string;
  callNumber: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    mrn: string; // Medical Record Number
    insuranceProvider: string;
  };
  duration: string;
  durationSeconds: number;
  timestamp: string;
  audioUrl?: string;
  status: CallStatus;
  priority: CallPriority;
  intent: CallIntent;
  secondaryIntents?: string[];
  sentiment: CallSentiment;
  sentimentScore: number; // -1 to +1
  summary: AISummary;
  transcript: TranscriptSegment[];
  actions: ActionExtraction[];
  commitments: Commitment[];
  assignedDepartment: string;
  agentName: string;
  slaRemainingHours: number;
}
