export interface PatientAppointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string; // e.g. "15 October"
  time: string; // e.g. "10:30 AM"
  location: string;
  status: "confirmed" | "pending" | "rescheduled" | "cancelled";
  type: "In-Person Consultation" | "Telehealth Review" | "Post-Op Wound Check";
  instructions?: string;
}

export interface PatientRequest {
  id: string;
  title: string;
  category: "Insurance" | "Prescription" | "Appointment" | "Billing" | "Medical Records";
  status: "In Progress" | "Under Review" | "Action Required" | "Resolved";
  createdDate: string;
  estimatedResolution: string;
  department: string;
  lastUpdateNotes: string;
}

export interface CommunicationRecord {
  id: string;
  callNumber: string;
  date: string;
  duration: string;
  channel: "Telephony Voice Call" | "Portal Message" | "Nurse Triage Check";
  summary: string;
  commitmentsMade: string[];
  hospitalResponse: string;
  status: "Resolved" | "Ongoing Follow-up";
}

export interface PatientNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "appointment" | "reminder" | "insurance" | "clinical";
  read: boolean;
  actionUrl?: string;
}

export interface PatientOverviewData {
  patientName: string;
  mrn: string;
  assignedPCP: string;
  insuranceStatus: "Active & Verified" | "Prior-Auth Under Review" | "Action Needed";
  insuranceProvider: string;
  upcomingAppointmentsCount: number;
  pendingRequestsCount: number;
  recentMessagesCount: number;
}
