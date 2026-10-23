import {
  Doctor,
  CreateDoctorPayload,
  DoctorAvailabilitySlot,
  apiDoctorService,
} from "./doctors/apiDoctorService";

/**
 * Enterprise Doctor Management Service
 * Bridges seamlessly between local fallback state and real backend APIs (/api/v1/doctors).
 * Provides drop-in compatibility for existing UI components and clinical queues.
 */
export const mockDoctorService = {
  async getDoctors(filters?: {
    specialization?: string;
    department?: string;
    status?: string;
    search?: string;
  }): Promise<Doctor[]> {
    return apiDoctorService.getDoctors(filters);
  },

  async getDoctorById(id: string): Promise<Doctor | null> {
    return apiDoctorService.getDoctorById(id);
  },

  async getMyDoctorProfile(): Promise<Doctor | null> {
    return apiDoctorService.getMyDoctorProfile();
  },

  async getAssignedPatients(doctorId?: string): Promise<any[]> {
    return apiDoctorService.getAssignedPatients(doctorId);
  },

  async updateAvailability(doctorId: string, availability: any[]): Promise<any[]> {
    return apiDoctorService.updateAvailability(doctorId, availability);
  },

  async assignPatient(doctorId: string, patientId: string): Promise<Doctor | null> {
    return apiDoctorService.assignPatient(doctorId, patientId);
  },

  async addClinicalNote(doctorId: string, patientId: string, note: string): Promise<any> {
    return apiDoctorService.addClinicalNote(doctorId, patientId, note);
  },

  async updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    return apiDoctorService.updateDoctor(doctorId, updates);
  },

  async createDoctor(payload: CreateDoctorPayload): Promise<Doctor> {
    return apiDoctorService.createDoctor(payload);
  },
};

export { apiDoctorService };
export type { Doctor, CreateDoctorPayload, DoctorAvailabilitySlot };
