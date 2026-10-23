import { Priority } from "@prisma/client";
import {
  RoutingEvaluationInput,
  RoutingEvaluationResult,
  DepartmentRoutingRule,
} from "./routing.types";

export class RoutingService {
  /**
   * Predefined Department Routing Rules
   */
  private readonly rules: DepartmentRoutingRule[] = [
    // 1. Emergency / Clinical Triage Alerts
    {
      departmentId: "clinical_triage",
      departmentName: "Clinical Triage",
      defaultPriority: Priority.URGENT,
      slaHours: 0.25, // 15 minutes
      patterns: [
        "emergency",
        "critical_symptoms",
        "critical",
        "triage",
        "chest_pain",
        "shortness_of_breath",
        "acute",
        "severe",
        "unconscious",
        "anaphylaxis",
      ],
    },

    // 2. Insurance Intents
    {
      departmentId: "insurance",
      departmentName: "Insurance Department",
      defaultPriority: Priority.HIGH,
      slaHours: 2.0, // 2 hours
      patterns: [
        "insurance",
        "insurance_verification",
        "prior_auth",
        "prior_authorization",
        "claim_inquiry",
        "claim",
        "preauth",
        "coverage",
        "copay",
        "deductible",
        "policy",
      ],
    },

    // 3. Complaint or Billing Intents
    {
      departmentId: "customer_support",
      departmentName: "Customer Support",
      defaultPriority: Priority.MEDIUM,
      slaHours: 6.0, // 6 hours
      patterns: [
        "complaint",
        "billing",
        "billing_dispute",
        "feedback",
        "invoice",
        "charge",
        "refund",
        "dispute",
        "grievance",
        "payment",
        "statement",
      ],
    },

    // 4. Appointment Intents
    {
      departmentId: "reception",
      departmentName: "Reception Team",
      defaultPriority: Priority.MEDIUM,
      slaHours: 4.0, // 4 hours
      patterns: [
        "appointment",
        "appointment_booking",
        "reschedule",
        "cancellation",
        "cancel",
        "schedule",
        "booking",
        "visit",
        "checkup",
        "consultation",
      ],
    },
  ];

  /**
   * Fallback routing rule when no intent matches
   */
  private readonly fallbackRule = {
    departmentId: "reception",
    departmentName: "Reception Team",
    defaultPriority: Priority.HIGH,
    slaHours: 2.0, // 2 hours
  };

  /**
   * Normalizes incoming raw intent strings (trims, lowercases, replaces non-alphanumeric with underscore)
   */
  normalizeIntent(intent: string): string {
    if (!intent) return "";
    return intent
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .replace(/_{2,}/g, "_");
  }

  /**
   * Evaluates intent and metadata to determine target department routing
   */
  evaluate(input: RoutingEvaluationInput): RoutingEvaluationResult {
    const rawIntent = input.intent ?? "";
    const normalized = this.normalizeIntent(rawIntent);

    // If sentiment is explicitly CRITICAL, elevate to clinical triage
    if (
      input.sentiment &&
      input.sentiment.toString().toUpperCase() === "CRITICAL"
    ) {
      const emergencyRule = this.rules.find(
        (r) => r.departmentId === "clinical_triage"
      )!;
      return {
        matched_intent: normalized || "critical_sentiment_override",
        department_id: emergencyRule.departmentId,
        department_name: emergencyRule.departmentName,
        default_priority: emergencyRule.defaultPriority,
        sla_hours: emergencyRule.slaHours,
      };
    }

    if (!normalized) {
      return {
        matched_intent: "fallback",
        department_id: this.fallbackRule.departmentId,
        department_name: this.fallbackRule.departmentName,
        default_priority: this.fallbackRule.defaultPriority,
        sla_hours: this.fallbackRule.slaHours,
      };
    }

    // Match against configured routing rules in order of precedence
    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (typeof pattern === "string") {
          // Exact match, prefix match, or tokenized inclusion
          if (
            normalized === pattern ||
            normalized.startsWith(`${pattern}_`) ||
            normalized.endsWith(`_${pattern}`) ||
            normalized.includes(`_${pattern}_`) ||
            normalized.includes(pattern)
          ) {
            return {
              matched_intent: pattern,
              department_id: rule.departmentId,
              department_name: rule.departmentName,
              default_priority: rule.defaultPriority,
              sla_hours: rule.slaHours,
            };
          }
        } else if (pattern instanceof RegExp && pattern.test(normalized)) {
          return {
            matched_intent: normalized,
            department_id: rule.departmentId,
            department_name: rule.departmentName,
            default_priority: rule.defaultPriority,
            sla_hours: rule.slaHours,
          };
        }
      }
    }

    // Unrecognized intent -> Safe fallback to reception
    return {
      matched_intent: normalized || "fallback",
      department_id: this.fallbackRule.departmentId,
      department_name: this.fallbackRule.departmentName,
      default_priority: this.fallbackRule.defaultPriority,
      sla_hours: this.fallbackRule.slaHours,
    };
  }
}

export const routingService = new RoutingService();
