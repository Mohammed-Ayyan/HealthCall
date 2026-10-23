"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  FileCheck2,
  Users2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { UserRole } from "@/shared/types/user";
import { useAuth } from "@/features/platform/auth/authContext";
import { Button } from "@/shared/components/ui/Button";
import { Input, Select } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

interface RoleOption {
  role: UserRole;
  label: string;
  department: string;
  badge: "emerald" | "teal" | "amber" | "default" | "red";
  icon: React.ComponentType<{ className?: string }>;
  destination: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "Patient",
    label: "Patient / Care Recipient",
    department: "Patient Access & Experience",
    badge: "emerald",
    icon: HeartHandshake,
    destination: "/patient/dashboard",
  },
  {
    role: "Doctor",
    label: "Doctor / Attending Physician",
    department: "Post-Surgical General & Acute Recovery",
    badge: "teal",
    icon: Stethoscope,
    destination: "/doctor/dashboard",
  },
  {
    role: "Receptionist",
    label: "Receptionist / Front Intake",
    department: "Central Intake & Scheduling",
    badge: "default",
    icon: UserCheck,
    destination: "/reception/dashboard",
  },
  {
    role: "Insurance Employee",
    label: "Insurance / Prior-Auth Specialist",
    department: "RCM & Carrier Relations",
    badge: "amber",
    icon: FileCheck2,
    destination: "/insurance/dashboard",
  },
  {
    role: "Manager",
    label: "Department Manager / Ops Lead",
    department: "Surgical Recovery & Operations",
    badge: "teal",
    icon: Users2,
    destination: "/manager/dashboard",
  },
  {
    role: "Admin",
    label: "Hospital Administrator / Executive",
    department: "Executive Healthcare Governance",
    badge: "emerald",
    icon: ShieldCheck,
    destination: "/admin/dashboard",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Doctor");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login({ email, password, role });
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        setErrorMsg("Failed to authenticate with current credentials.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demo: { email: string; role: UserRole }) => {
    setEmail(demo.email);
    setPassword("password123");
    setRole(demo.role);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login({ email: demo.email, password: "password123", role: demo.role });
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        setErrorMsg("Failed to authenticate demo user.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication error.");
    } finally {
      setLoading(false);
    }
  };

  const DEMO_ACCOUNTS = [
    {
      role: "Doctor" as UserRole,
      title: "Doctor",
      name: "Dr. Rahul Sharma",
      email: "dr.rahul@metrohealth.eco",
      badge: "teal" as const,
      icon: Stethoscope,
    },
    {
      role: "Receptionist" as UserRole,
      title: "Receptionist",
      name: "Clara Oswald",
      email: "clara.o@metrohealth.eco",
      badge: "default" as const,
      icon: UserCheck,
    },
    {
      role: "Patient" as UserRole,
      title: "Patient",
      name: "Rahul Sharma",
      email: "rahul.sharma@email.com",
      badge: "emerald" as const,
      icon: HeartHandshake,
    },
    {
      role: "Insurance Employee" as UserRole,
      title: "Insurance",
      name: "Marcus Shaw",
      email: "marcus.s@metrohealth.eco",
      badge: "amber" as const,
      icon: FileCheck2,
    },
    {
      role: "Manager" as UserRole,
      title: "Manager",
      name: "Eleanor Vance",
      email: "eleanor.v@metrohealth.eco",
      badge: "teal" as const,
      icon: Users2,
    },
    {
      role: "Admin" as UserRole,
      title: "Admin",
      name: "Admin Lead",
      email: "admin@metrohealth.eco",
      badge: "red" as const,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#f7f9f6] text-[#142019] relative overflow-hidden">
      {/* Solarpunk subtle background ambient blooms */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10 py-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-[#1b4332] items-center justify-center shadow-[0_4px_16px_rgba(27,67,50,0.2)] mb-1">
            <HeartHandshake className="h-6 w-6 text-[#74c69d]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#142019] font-heading">
              CareOps AI
            </h1>
            <Badge variant="emerald">Eco-Futuristic v2.4</Badge>
          </div>
          <p className="text-xs text-[#627267] max-w-sm mx-auto">
            Sustainable hospital operations & intelligent healthcare call triage platform
          </p>
        </div>

        {/* Demo Showcase Quick Fill Box */}
        <Card variant="default" className="p-4 bg-white/90 backdrop-blur-xs border-[#cfe0cc] shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1b4332] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
              1-Click Demo Profiles (Instant Sign-In)
            </span>
            <span className="text-[10px] text-[#607264] font-medium">Demo Ready</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => handleQuickDemoLogin(d)}
                  disabled={loading}
                  className="p-2 rounded-xl border border-[#dce5da] bg-[#f9faf8] hover:bg-[#ecfdf5] hover:border-[#a7f3d0] transition-all text-left flex flex-col justify-between group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="h-3.5 w-3.5 text-[#059669] group-hover:scale-110 transition-transform" />
                    <Badge variant={d.badge} size="sm">
                      {d.title}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#142019] truncate">{d.name}</p>
                    <p className="text-[10px] text-[#607264] font-mono truncate">{d.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Login Card */}
        <Card variant="elevated" className="p-6 sm:p-8 bg-white border-[#d8e2d6] shadow-[0_8px_30px_rgba(20,32,25,0.06)] space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <span className="font-semibold">Notice:</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#28382e] mb-1.5">
                Select Your Hospital Role
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#d8e2d6] rounded-xl text-xs font-medium text-[#142019] focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 focus:border-[#1b4332] transition-colors cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.role} value={opt.role}>
                    {opt.label} — {opt.destination}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#627267]">
                <Sparkles className="h-3 w-3 text-[#059669]" />
                <span>Redirects automatically to dedicated portal: <code className="font-mono text-[#1b4332] font-semibold">{ROLE_OPTIONS.find((r) => r.role === role)?.destination}</code></span>
              </div>
            </div>

            <Input
              label="Staff / Patient Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dr.rahul@metrohealth.eco"
              required
            />

            <Input
              label="Secure Password / Passkey"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 shadow-sm"
              loading={loading}
            >
              <span>Sign In to {role} Console</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Real Backend Authentication Assurance */}
          <div className="pt-4 border-t border-[#edf2ea] flex items-center justify-between text-[11px] text-[#627267]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#059669]" />
              <span>Real MongoDB JWT Authentication</span>
            </div>
            <span className="font-mono text-[#1b4332] font-semibold">Strict RBAC</span>
          </div>
        </Card>

        {/* Footer links */}
        <div className="text-center text-xs text-[#627267] flex items-center justify-center gap-3">
          <Link href="/auth/signup" className="hover:text-[#1b4332] font-medium transition-colors">
            Register New Staff
          </Link>
          <span>•</span>
          <Link href="/landing" className="hover:text-[#1b4332] font-medium transition-colors">
            Product Vision & Story
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-[#1b4332] font-medium transition-colors">
            Global Ops View
          </Link>
        </div>
      </div>
    </div>
  );
}
