"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, ArrowRight, AlertCircle } from "lucide-react";
import { UserRole } from "@/shared/types/user";
import { DepartmentName } from "@/shared/types/action";
import { useAuth } from "@/features/platform/auth/authContext";
import { Button } from "@/shared/components/ui/Button";
import { Input, Select } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Doctor");
  const [department, setDepartment] = useState<DepartmentName>("Clinical Team");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        password,
        role,
        department,
      });
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#f7f9f6] text-[#142019] relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 py-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-[#1b4332] items-center justify-center shadow-[0_4px_16px_rgba(27,67,50,0.2)] mb-1">
            <HeartHandshake className="h-6 w-6 text-[#74c69d]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#142019] font-heading">
              Join Hospital Network
            </h1>
            <Badge variant="emerald">Self-Registration</Badge>
          </div>
          <p className="text-xs text-[#627267]">
            Register staff or clinical credentials into CareOps AI
          </p>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8 bg-white border-[#d8e2d6] shadow-[0_8px_30px_rgba(20,32,25,0.06)] space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name & Clinical Credentials"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jordan Hayes, MD"
              required
            />

            <Input
              label="Hospital Staff Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="j.hayes@metrohealth.eco"
              required
            />

            <Input
              label="Create Secure Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { label: "Doctor", value: "Doctor" },
                  { label: "Patient", value: "Patient" },
                  { label: "Receptionist", value: "Receptionist" },
                  { label: "Insurance Employee", value: "Insurance Employee" },
                  { label: "Manager", value: "Manager" },
                  { label: "Admin", value: "Admin" },
                ]}
              />

              <Select
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value as DepartmentName)}
                options={[
                  { label: "Clinical Team", value: "Clinical Team" },
                  { label: "Reception", value: "Reception" },
                  { label: "Insurance", value: "Insurance" },
                  { label: "Billing", value: "Billing" },
                  { label: "Pharmacy", value: "Pharmacy" },
                  { label: "Emergency Triage", value: "Emergency Triage" },
                ]}
              />
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full gap-2" loading={loading}>
              <span>Complete Registration</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="pt-3 border-t border-[#edf2ea] text-center text-xs text-[#627267]">
            Already an active member?{" "}
            <Link href="/auth/login" className="text-[#1b4332] hover:underline font-semibold">
              Sign In Here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
