export interface ReceptionOverviewData {
  receptionistName: string;
  frontDeskStation: string;
  pendingBookingsCount: number;
  confirmedAppointmentsCount: number;
  cancelledRequestsCount: number;
  openCallTasksCount: number;
}

export interface ReceptionAppointment {
  id: string;
  patientName: string;
  mrn: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
  source: "CareOps Telephony AI" | "Walk-In Front Desk" | "Patient Portal" | "Emergency Triage";
  notes?: string;
}

export interface ReceptionCallAction {
  id: string;
  callId: string;
  callerName: string;
  callerPhone: string;
  taskTitle: string; // e.g. "Schedule appointment", "Verify insurance coverage"
  priority: "high" | "medium" | "low";
  deadline: string; // e.g. "Today (by 2:00 PM)"
  aiSummaryExtract: string;
  status: "Pending Action" | "In Progress" | "Completed";
  assignedDoctorPreference?: string;
}

export interface DirectoryPatient {
  id: string;
  mrn: string;
  name: string;
  contact: string;
  email: string;
  dob: string;
  insuranceProvider: string;
  lastVisit: string;
  totalAppointments: number;
}

export interface DoctorScheduleSlot {
  doctorName: string;
  specialty: string;
  availability: "Available" | "In Surgery" | "Fully Booked" | "On Break";
  availableSlots: string[];
}
