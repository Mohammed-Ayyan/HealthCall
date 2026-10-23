import React from "react";
import {
  Calendar,
  FileCheck,
  AlertTriangle,
  Receipt,
  Pill,
  Siren,
  Target,
} from "lucide-react";
import { CallIntent } from "@/shared/types/call";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { cn } from "@/shared/utils/cn";

export interface IntentDetectorProps {
  detectedIntent: CallIntent;
  secondaryIntents?: string[];
  className?: string;
}

const allIntents: { name: CallIntent; icon: React.ReactNode; desc: string }[] = [
  {
    name: "Appointment Request",
    icon: <Calendar className="h-4 w-4" />,
    desc: "Post-op, specialist, or routine consult scheduling",
  },
  {
    name: "Insurance Query",
    icon: <FileCheck className="h-4 w-4" />,
    desc: "Pre-authorization, claims, or coverage inquiry",
  },
  {
    name: "Complaint",
    icon: <AlertTriangle className="h-4 w-4" />,
    desc: "Service delay, staff feedback, or dispute",
  },
  {
    name: "Billing Issue",
    icon: <Receipt className="h-4 w-4" />,
    desc: "Duplicate debit, invoice balance, or copay question",
  },
  {
    name: "Medicine Refill",
    icon: <Pill className="h-4 w-4" />,
    desc: "Prescription renewal, pharmacy transfer, or dosage",
  },
  {
    name: "Emergency Concern",
    icon: <Siren className="h-4 w-4" />,
    desc: "Acute clinical symptom, 911 EMS dispatch, ER triage",
  },
  {
    name: "Follow-up Request",
    icon: <Calendar className="h-4 w-4" />,
    desc: "Post-op, test results, or scheduled post-visit consultation",
  },
  {
    name: "General Inquiry",
    icon: <Target className="h-4 w-4" />,
    desc: "Hospital directions, visiting hours, or facility questions",
  },
];

export function IntentDetector({
  detectedIntent,
  secondaryIntents = [],
  className,
}: IntentDetectorProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] flex items-center justify-center text-[#1b4332]">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Clinical Intent Classification</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Multi-label intent classifier mapping to hospital departmental routing
            </p>
          </div>
        </div>
      </CardHeader>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {allIntents.map((item) => {
          const isPrimary = item.name === detectedIntent;
          const isSecondary = secondaryIntents.includes(item.name);

          return (
            <div
              key={item.name}
              className={cn(
                "p-3 rounded-xl border transition-all duration-200 relative overflow-hidden",
                isPrimary
                  ? "bg-[#f0fdf4] border-[#059669] shadow-xs ring-1 ring-[#059669]/20"
                  : isSecondary
                  ? "bg-[#f0fdfa] border-[#0d9488]"
                  : "bg-[#f7f9f6] border-[#e2e8e0] opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={cn(
                    "p-1.5 rounded-lg",
                    isPrimary
                      ? "bg-[#e8f5e9] text-[#059669]"
                      : isSecondary
                      ? "bg-[#ccfbf1] text-[#0d9488]"
                      : "bg-[#edf2ec] text-[#607264]"
                  )}
                >
                  {item.icon}
                </div>

                {isPrimary && (
                  <span className="text-[10px] font-mono font-bold text-[#059669] bg-[#e8f5e9] px-2 py-0.5 rounded-full border border-[#c8e6c9]">
                    Primary Intent (98%)
                  </span>
                )}
                {isSecondary && (
                  <span className="text-[10px] font-mono font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-full border border-[#99f6e4]">
                    Secondary (84%)
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-[#142019]">
                {item.name}
              </h4>
              <p className="text-[11px] text-[#607264] mt-0.5 leading-snug">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
