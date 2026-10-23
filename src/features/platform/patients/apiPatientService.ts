/**
 * CareOps AI - Real Backend Patient Management Client
 * 
 * Direct API client for the Express / MongoDB backend (/api/v1/patients).
 * Provides full CRUD operations, role-scoped queries, search, and profile retrieval.
 */

import { getClientToken } from "../auth/sessionStore";

export interface Patient {
  id: string;
  userId?: string;
  mrn: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  medicalSummary?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  department?: string;
  insuranceProvider?: string;
  insuranceStatus?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePatientPayload {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  medicalSummary?: string;
  department?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  insuranceProvider?: string;
  password?: string;
}

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  return getClientToken();
}

function normalizePatientFromApi(apiPatient: any): Patient {
  return {
    id: apiPatient.id || apiPatient._id,
    userId: apiPatient.userId,
    mrn: apiPatient.mrn,
    name: apiPatient.name,
    email: apiPatient.email,
    phone: apiPatient.phone,
    dateOfBirth: apiPatient.dateOfBirth,
    gender: apiPatient.gender,
    address: apiPatient.address,
    bloodGroup: apiPatient.bloodGroup,
    emergencyContact: apiPatient.emergencyContact,
    medicalSummary: apiPatient.medicalSummary,
    assignedDoctorId: apiPatient.assignedDoctorId || "",
    assignedDoctorName: apiPatient.assignedDoctorName || "Unassigned",
    department: apiPatient.department || "General",
    insuranceProvider: apiPatient.insuranceProvider || "Self-Pay / Pending Verification",
    insuranceStatus: apiPatient.insuranceStatus || "Active",
    status: apiPatient.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    createdAt: apiPatient.createdAt || new Date().toISOString(),
    updatedAt: apiPatient.updatedAt || new Date().toISOString(),
  };
}

export const apiPatientService = {
  /**
   * GET /api/v1/patients
   * Retrieve list of patients with optional filtering, search, and pagination.
   */
  async getPatients(filters?: {
    search?: string;
    gender?: string;
    bloodGroup?: string;
    status?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Patient[]> {
    const token = getAuthToken();

    if (!token) {
      return [];
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append("search", filters.search);
      if (filters?.gender) queryParams.append("gender", filters.gender);
      if (filters?.bloodGroup) queryParams.append("bloodGroup", filters.bloodGroup);
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.department) queryParams.append("department", filters.department);
      if (filters?.startDate) queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);

      const url = `${BACKEND_BASE_URL}/patients${
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
        if (data.success && Array.isArray(data.patients)) {
          return data.patients.map(normalizePatientFromApi);
        }
      }
    } catch (err: any) {
      console.error("[apiPatientService] Backend request failed:", err.message);
    }

    return [];
  },

  /**
   * GET /api/v1/patients/:id
   * Retrieve single patient details.
   */
  async getPatientById(id: string): Promise<Patient | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/patients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.patient) {
          return normalizePatientFromApi(data.patient);
        }
      }
    } catch (err: any) {
      console.error(`[apiPatientService] Failed to get patient ${id}:`, err.message);
    }

    return null;
  },

  /**
   * GET /api/v1/patients/profile/me
   * Retrieve authenticated patient's own profile.
   */
  async getMyProfile(): Promise<Patient | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/patients/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.patient) {
          return normalizePatientFromApi(data.patient);
        }
      }
    } catch (err: any) {
      console.error("[apiPatientService] Failed to get my profile:", err.message);
    }

    return null;
  },

  /**
   * POST /api/v1/patients
   * Create a new patient record (Doctor, Receptionist, Admin).
   */
  async createPatient(payload: CreatePatientPayload): Promise<Patient> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to create patient.");

    const res = await fetch(`${BACKEND_BASE_URL}/patients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.patient) {
      throw new Error(data.message || "Failed to create patient on backend.");
    }

    return normalizePatientFromApi(data.patient);
  },

  /**
   * PATCH /api/v1/patients/:id
   * Update patient information.
   */
  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to update patient.");

    const res = await fetch(`${BACKEND_BASE_URL}/patients/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.patient) {
      throw new Error(data.message || "Failed to update patient on backend.");
    }

    return normalizePatientFromApi(data.patient);
  },

  /**
   * DELETE /api/v1/patients/:id
   * Soft delete patient record.
   */
  async deletePatient(id: string): Promise<boolean> {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token required to delete patient.");

    const res = await fetch(`${BACKEND_BASE_URL}/patients/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete patient on backend.");
    }

    return true;
  },
};
