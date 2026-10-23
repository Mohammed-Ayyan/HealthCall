import { CallPriority, CallSentiment } from "../types/call";

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function getPriorityBadgeClass(priority: CallPriority): string {
  switch (priority) {
    case "critical":
      return "bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]";
    case "high":
      return "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]";
    case "medium":
      return "bg-[#f0fdfa] text-[#0d9488] border border-[#99f6e4]";
    case "low":
      return "bg-[#f0f4ef] text-[#607264] border border-[#dce5da]";
  }
}

export function getSentimentBadgeClass(sentiment: CallSentiment): string {
  switch (sentiment) {
    case "positive":
      return "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]";
    case "neutral":
      return "bg-[#f0f4ef] text-[#607264] border border-[#dce5da]";
    case "concerned":
      return "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]";
    case "frustrated":
      return "bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]";
    case "angry":
      return "bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]";
  }
}

export function getDepartmentColorClass(dept: string): string {
  switch (dept.toLowerCase()) {
    case "reception":
      return "text-[#0d9488] bg-[#f0fdfa] border-[#99f6e4]";
    case "insurance":
      return "text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]";
    case "customer support":
      return "text-[#2563eb] bg-[#eff6ff] border-[#bfdbfe]";
    case "billing":
      return "text-[#d97706] bg-[#fffbeb] border-[#fde68a]";
    case "pharmacy":
      return "text-[#059669] bg-[#ecfdf5] border-[#a7f3d0]";
    case "emergency triage":
    case "emergency":
      return "text-[#dc2626] bg-[#fee2e2] border-[#fca5a5]";
    default:
      return "text-[#607264] bg-[#f0f4ef] border-[#dce5da]";
  }
}
