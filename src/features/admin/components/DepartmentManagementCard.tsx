"use client";

import React, { useState } from "react";
import { Building2, Plus, X, Check, Loader2 } from "lucide-react";
import { HospitalDepartment } from "../types";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { adminService } from "../services/adminService";

export interface DepartmentManagementCardProps {
  departments: HospitalDepartment[];
}

export function DepartmentManagementCard({ departments: initialDepartments }: DepartmentManagementCardProps) {
  const [departments, setDepartments] = useState<HospitalDepartment[]>(initialDepartments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await adminService.createDepartment({
        name: name.trim(),
        description: description.trim(),
        status,
      });

      setDepartments([created, ...departments]);
      setName("");
      setDescription("");
      setStatus("ACTIVE");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-white border-[#e2e8df] shadow-sm">
      <CardHeader className="border-b border-[#edf2ea] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#e8f3ec] text-[#1b4332] flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-[#142019]">Hospital Department Ecosystem</CardTitle>
              <p className="text-xs text-[#627267] mt-0.5">
                Doctor hubs, Reception desks, Insurance & Billing units, and Patient Support wings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Badge variant="teal">{departments.length} Divisions Active</Badge>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1b4332] text-white hover:bg-[#143326] transition-colors shadow-xs"
            >
              {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddForm ? "Cancel" : "Add Department"}
            </button>
          </div>
        </div>

        {/* Inline Department Creation Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateDepartment}
            className="mt-4 p-4 rounded-xl bg-[#f8faf8] border border-[#dce8df] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                New Hospital Department Registration
              </h5>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#28382e] mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cardiology & Vascular Wing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#c8d8cb] bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#28382e] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#c8d8cb] bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#28382e] mb-1">
                Description / Operational Scope
              </label>
              <textarea
                placeholder="Brief description of clinical or operational responsibilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#c8d8cb] bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-[#627267] hover:text-[#142019]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {submitting ? "Registering..." : "Create Department"}
              </button>
            </div>
          </form>
        )}
      </CardHeader>

      <div className="divide-y divide-[#edf2ea]">
        {departments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#627267]">
            No departments found. Click "Add Department" to register the first hospital division.
          </div>
        ) : (
          departments.map((dept) => (
            <div
              key={dept.id}
              className="p-5 hover:bg-[#fbfdfb] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#e8f3ec] text-[#1b4332] border border-[#dce8df] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold font-mono text-xs">
                  {dept.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#142019]">{dept.name}</h4>
                    <Badge
                      variant={dept.status === "High Demand" ? "amber" : "emerald"}
                      size="sm"
                    >
                      {dept.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#28382e] mt-1">
                    Department Lead: <span className="text-[#142019] font-semibold">{dept.leadName}</span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#627267] mt-2 font-mono flex-wrap">
                    <span>Staff: {dept.staffCount} specialists</span>
                    <span>•</span>
                    <span className="text-[#059669] font-semibold">{dept.openCommitmentsCount} active commitments</span>
                  </div>

                  {/* Workload score indicator */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="w-40 h-1.5 rounded-full bg-[#e2e8df] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dept.currentWorkloadScore > 90 ? "bg-[#d97706]" : "bg-[#059669]"
                        }`}
                        style={{ width: `${dept.currentWorkloadScore}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-[#627267]">
                      Load: {dept.currentWorkloadScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <span className="text-xs font-mono text-[#059669] bg-[#f0fdf4] px-3 py-1.5 rounded-lg border border-[#bbf7d0]">
                  Operational
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
