import { UserRole } from "@/shared/types/user";

export interface RoleConfig {
  role: UserRole;
  title: string;
  defaultDashboard: string;
  department: string;
  description: string;
  allowedPrefixes: string[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  Patient: {
    role: "Patient",
    title: "Patient / Care Recipient",
    defaultDashboard: "/patient/dashboard",
    department: "Patient Access & Care Experience",
    description: "Track appointment requests, view care history, and communicate with clinicians.",
    allowedPrefixes: [
      "/patient",
      "/profile",
      "/notifications",
    ],
  },
  Doctor: {
    role: "Doctor",
    title: "Attending Physician / Surgeon",
    defaultDashboard: "/doctor/dashboard",
    department: "Clinical Pavilion & Surgery",
    description: "Clinical patient encounters, AI patient briefs, and post-op follow-up dispatch.",
    allowedPrefixes: [
      "/doctor",
      "/calls",
      "/actions",
      "/patient",
      "/dashboard",
      "/profile",
      "/notifications",
    ],
  },
  Receptionist: {
    role: "Receptionist",
    title: "Front Desk & Intake Lead",
    defaultDashboard: "/reception/dashboard",
    department: "Intake & Telephony Gateway",
    description: "Multi-provider calendar coordination, patient registration, and call action resolution.",
    allowedPrefixes: [
      "/reception",
      "/calls",
      "/actions",
      "/patient",
      "/dashboard",
      "/profile",
      "/notifications",
    ],
  },
  "Insurance Employee": {
    role: "Insurance Employee",
    title: "RCM & Prior-Authorization Specialist",
    defaultDashboard: "/insurance/dashboard",
    department: "Revenue Cycle & Carrier Relations",
    description: "Prior-authorization clearance, payer appeals, and claims adjudication tracking.",
    allowedPrefixes: [
      "/insurance",
      "/calls",
      "/actions",
      "/dashboard",
      "/profile",
      "/notifications",
    ],
  },
  Manager: {
    role: "Manager",
    title: "Department Operations Manager",
    defaultDashboard: "/manager/dashboard",
    department: "Operations Command & Recovery",
    description: "Team capacity monitoring, SLA incident escalation, and resource reassignment.",
    allowedPrefixes: [
      "/manager",
      "/doctor",
      "/reception",
      "/insurance",
      "/dashboard",
      "/calls",
      "/actions",
      "/analytics",
      "/users",
      "/profile",
      "/notifications",
      "/settings",
    ],
  },
  Admin: {
    role: "Admin",
    title: "Hospital Administrator",
    defaultDashboard: "/admin/dashboard",
    department: "Executive Healthcare Governance",
    description: "Full system governance, universal RBAC, system routing rules, and enterprise analytics.",
    allowedPrefixes: [
      "/admin",
      "/manager",
      "/doctor",
      "/reception",
      "/insurance",
      "/patient",
      "/dashboard",
      "/calls",
      "/actions",
      "/analytics",
      "/users",
      "/profile",
      "/notifications",
      "/settings",
    ],
  },
};

export function getRoleDashboard(role: UserRole): string {
  return ROLE_CONFIGS[role]?.defaultDashboard || "/dashboard";
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Public or universally accessible routes
  const publicRoutes = ["/landing", "/auth/login", "/auth/signup", "/profile"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return true;
  }

  // Admin has access to everything
  if (role === "Admin") {
    return true;
  }

  const config = ROLE_CONFIGS[role];
  if (!config) return false;

  // Check if pathname starts with any allowed prefix
  return config.allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
}
