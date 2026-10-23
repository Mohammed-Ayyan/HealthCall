import { Patient, CreatePatientPayload, apiPatientService } from "./patients/apiPatientService";

/**
 * Enterprise Patient Management Service
 * Bridges seamlessly between local fallback state and real backend APIs (/api/v1/patients).
 * Provides drop-in compatibility for existing UI components and services.
 */
export const mockPatientService = {
  async getPatients(filters?: {
    search?: string;
    gender?: string;
    bloodGroup?: string;
    status?: string;
    department?: string;
  }): Promise<Patient[]> {
    return apiPatientService.getPatients(filters);
  },

  async getPatientById(id: string): Promise<Patient | null> {
    return apiPatientService.getPatientById(id);
  },

  async getMyProfile(): Promise<Patient | null> {
    return apiPatientService.getMyProfile();
  },

  async createPatient(newPatient: CreatePatientPayload): Promise<Patient> {
    return apiPatientService.createPatient(newPatient);
  },

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    return apiPatientService.updatePatient(id, updates);
  },

  async deletePatient(id: string): Promise<boolean> {
    return apiPatientService.deletePatient(id);
  },
};

export { apiPatientService };
export type { Patient, CreatePatientPayload };
