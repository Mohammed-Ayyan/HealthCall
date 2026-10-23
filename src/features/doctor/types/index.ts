export interface DoctorOverviewData {
  doctorName: string;
  specialty: string;
  department: string;
  todaysAppointmentsCount: number;
  pendingFollowupsCount: number;
  urgentCasesCount: number;
  nextPatientTime: string;
}

export interface DoctorQueuePatient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  appointmentTime: string;
  issue: string;
  priority: "urgent" | "high" | "medium" | "routine";
  status: "Checked In" | "In Consultation" | "Waiting Room" | "Pending Labs";
  roomNumber: string;
  aiBrief: {
    summary: string;
    previousConversation: string;
    pendingIssue: string;
    requiredAction: string;
    keyVitalsAlert?: string;
  };
  medicalRequests: {
    id: string;
    title: string;
    status: string;
    urgency: string;
  }[];
  followupHistory: {
    date: string;
    notes: string;
    doctor: string;
  }[];
}

export interface DoctorFollowUp {
  id: string;
  patientId: string;
  patientName: string;
  scheduledDate: string;
  protocol: string;
  notes: string;
  status: "Pending Clinician Review" | "Scheduled" | "Completed" | "Escalated";
  assignedTo: string; // e.g. "Nurse Triage Unit 2", "Dr. Rahul"
  priority: "high" | "medium" | "low";
}
