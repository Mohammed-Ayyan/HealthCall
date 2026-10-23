"use client";

import React, { useState } from "react";
import { Search, UserPlus, Phone, Mail, Calendar, ShieldCheck, History, ArrowUpRight } from "lucide-react";
import { DirectoryPatient } from "../types";
import { receptionService } from "../services/receptionService";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";

export interface PatientDirectoryProps {
  initialPatients: DirectoryPatient[];
}

export function PatientDirectory({ initialPatients }: PatientDirectoryProps) {
  const [patients, setPatients] = useState<DirectoryPatient[]>(initialPatients);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<DirectoryPatient | null>(null);

  // New patient state
  const [newName, setNewName] = useState("");
  const [newMrn, setNewMrn] = useState("MRN-884920");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDob, setNewDob] = useState("1992-05-14");
  const [newInsurance, setNewInsurance] = useState("BlueCross Premier PPO");

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact.includes(searchTerm)
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await receptionService.createPatient({
      mrn: newMrn,
      name: newName,
      contact: newContact,
      email: newEmail,
      dob: newDob,
      insuranceProvider: newInsurance,
      lastVisit: "Today (Intake)",
    });
    setPatients([created, ...patients]);
    setIsCreateModalOpen(false);
    setNewName("");
    setNewContact("");
    setNewEmail("");
  };

  return (
    <>
      <Card className="bg-white border-[#e2e8df] shadow-sm">
        <CardHeader className="border-b border-[#edf2ea] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-[#142019]">Patient Directory & Registration</CardTitle>
                <p className="text-xs text-[#627267] mt-0.5">
                  Universal patient index with demographic lookups, insurance verifications, and visit history
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Patient</span>
            </Button>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#627267]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, MRN, phone number..."
              className="pl-10"
            />
          </div>
        </CardHeader>

        <div className="divide-y divide-[#edf2ea]">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#627267]">
              No registered patients found matching "{searchTerm}".
            </div>
          ) : (
            filteredPatients.map((pat) => (
              <div
                key={pat.id}
                className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{pat.name}</h4>
                    <Badge variant="teal" size="sm" className="font-mono">
                      {pat.mrn}
                    </Badge>
                    <span className="text-xs text-[#627267]">DOB: {pat.dob}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#627267] mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[#28382e]">
                      <Phone className="h-3 w-3 text-[#059669]" /> {pat.contact}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#28382e]">
                      <Mail className="h-3 w-3 text-[#0d9488]" /> {pat.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#627267] mt-2">
                    <span className="text-[#28382e] flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#d97706]" /> {pat.insuranceProvider}
                    </span>
                    <span>•</span>
                    <span>Last visit: {pat.lastVisit}</span>
                    <span>•</span>
                    <span className="font-mono text-[#94a399]">{pat.totalAppointments} records</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatientForHistory(pat)}
                    className="border-[#dce8df] text-[#28382e] hover:text-[#1b4332] flex items-center gap-1.5"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>View History</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Register Patient Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Patient Profile"
        className="max-w-lg bg-white border-[#e2e8df]"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Full Legal Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Generated MRN
              </label>
              <Input
                value={newMrn}
                onChange={(e) => setNewMrn(e.target.value)}
                required
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Contact Phone
              </label>
              <Input
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="+1 (555) 000-0000"
                required
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#142019] block mb-1.5">
                Date of Birth
              </label>
              <Input
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                type="date"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Email Address
            </label>
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="patient@example.com"
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#142019] block mb-1.5">
              Insurance Carrier & Plan
            </label>
            <Input
              value={newInsurance}
              onChange={(e) => setNewInsurance(e.target.value)}
              placeholder="e.g. BlueCross Premier PPO"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#edf2ea]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* Patient History Modal */}
      {selectedPatientForHistory && (
        <Modal
          isOpen={!!selectedPatientForHistory}
          onClose={() => setSelectedPatientForHistory(null)}
          title={`Encounter History • ${selectedPatientForHistory.name}`}
          className="max-w-md bg-white border-[#e2e8df]"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-[#f7f9f6] rounded-xl border border-[#e2e8df]">
              <p className="text-[#142019] font-medium">Demographics & Insurance</p>
              <p className="text-[#627267] mt-1">MRN: <span className="font-mono text-[#142019] font-semibold">{selectedPatientForHistory.mrn}</span></p>
              <p className="text-[#627267]">Carrier: <span className="text-[#142019]">{selectedPatientForHistory.insuranceProvider}</span></p>
              <p className="text-[#627267]">Phone: <span className="text-[#142019] font-mono">{selectedPatientForHistory.contact}</span></p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-[#627267] uppercase tracking-wider text-[11px]">
                Encounter History
              </p>
              {selectedPatientForHistory.totalAppointments > 0 ? (
                <div className="bg-[#fcfdfc] p-2.5 rounded-lg border border-[#e2e8df]">
                  <p className="font-medium text-[#142019]">Latest Clinical Appointment</p>
                  <p className="text-[#627267] text-[11px]">{selectedPatientForHistory.lastVisit}</p>
                </div>
              ) : (
                <div className="p-3 bg-[#fcfdfc] rounded-lg border border-dashed border-[#d8e2d6] text-center">
                  <p className="text-xs text-[#627267]">No historical encounters recorded for this patient.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#edf2ea]">
              <Button variant="outline" size="sm" onClick={() => setSelectedPatientForHistory(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
