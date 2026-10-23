/**
 * CareOps AI - Real Backend Appointment Client
 * 
 * Direct API client for /api/v1/appointments.
 * Handles appointment creation, retrieval, rescheduling, and cancellation.
 */

import { getClientToken } from "../auth/sessionStore";

export interface Appointment {
  id: string;
  patientId?: string;
  patientUserId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  mrn?: string;
  doctorId?: string;
  doctorName: string;
  doctorSpecialty?: string;
  date: string;
  time: string;
  location?: string;
  type?: string;
  status: "confirmed" | "pending" | "rescheduled" | "cancelled" | "completed";
  instructions?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentPayload {
  doctorId?: string;
  doctorName: string;
  doctorSpecialty?: string;
  date: string;
  time: string;
  location?: string;
  type?: string;
  instructions?: string;
  notes?: string;
  status?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  mrn?: string;
}

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

function normalizeAppointment(apiApt: any): Appointment {
  return {
    id: apiApt.id || apiApt._id,
    patientId: apiApt.patientId,
    patientUserId: apiApt.patientUserId,
    patientName: apiApt.patientName || "Patient",
    patientEmail: apiApt.patientEmail || "",
    patientPhone: apiApt.patientPhone || "",
    mrn: apiApt.mrn || "",
    doctorId: apiApt.doctorId,
    doctorName: apiApt.doctorName,
    doctorSpecialty: apiApt.doctorSpecialty || "General Medicine",
    date: apiApt.date,
    time: apiApt.time,
    location: apiApt.location || "Pavilion 3 (Metro Health)",
    type: apiApt.type || "In-Person Consultation",
    status: apiApt.status || "confirmed",
    instructions: apiApt.instructions || "",
    notes: apiApt.notes || "",
    createdAt: apiApt.createdAt || new Date().toISOString(),
    updatedAt: apiApt.updatedAt || new Date().toISOString(),
  };
}

export const apiAppointmentService = {
  /**
   * GET /api/v1/appointments
   */
  async getAppointments(filters?: {
    doctorName?: string;
    date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const queryParams = new URLSearchParams();
      if (filters?.doctorName) queryParams.append("doctorName", filters.doctorName);
      if (filters?.date) queryParams.append("date", filters.date);
      if (filters?.status) queryParams.append("status", filters.status);

      const url = `${BACKEND_BASE_URL}/appointments${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.appointments)) {
          return data.appointments.map(normalizeAppointment);
        }
      }
    } catch (err: any) {
      console.error("[apiAppointmentService] Failed to load appointments:", err.message);
    }

    return [];
  },

  /**
   * POST /api/v1/appointments
   */
  async createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to book an appointment");

    const res = await fetch(`${BACKEND_BASE_URL}/appointments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.appointment) {
      throw new Error(data.message || "Failed to book appointment on backend");
    }

    return normalizeAppointment(data.appointment);
  },

  /**
   * PATCH /api/v1/appointments/:id
   */
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/appointments/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.appointment) {
          return normalizeAppointment(data.appointment);
        }
      }
    } catch (err: any) {
      console.error(`[apiAppointmentService] Failed to update appointment ${id}:`, err.message);
    }

    return null;
  },

  /**
   * DELETE /api/v1/appointments/:id
   */
  async cancelAppointment(id: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/appointments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        return true;
      }
    } catch (err: any) {
      console.error(`[apiAppointmentService] Failed to cancel appointment ${id}:`, err.message);
    }

    return false;
  },
};
