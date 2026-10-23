import React from "react";
import { Smile, Meh, AlertCircle, Frown, Flame, Heart } from "lucide-react";
import { CallSentiment } from "@/shared/types/call";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { cn } from "@/shared/utils/cn";

export interface SentimentGaugeProps {
  sentiment: CallSentiment;
  sentimentScore: number; // -1.0 to +1.0
  className?: string;
}

const sentimentSpectrum: {
  label: CallSentiment;
  displayName: string;
  color: string;
  badgeBg: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "positive",
    displayName: "Positive",
    color: "from-emerald-500 to-teal-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: <Smile className="h-4 w-4" />,
  },
  {
    label: "neutral",
    displayName: "Neutral",
    color: "from-slate-500 to-slate-400",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: <Meh className="h-4 w-4" />,
  },
  {
    label: "concerned",
    displayName: "Concerned",
    color: "from-amber-500 to-yellow-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  {
    label: "frustrated",
    displayName: "Frustrated",
    color: "from-orange-500 to-amber-600",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: <Frown className="h-4 w-4" />,
  },
  {
    label: "angry",
    displayName: "Angry",
    color: "from-rose-600 to-red-500",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    icon: <Flame className="h-4 w-4" />,
  },
];

export function SentimentGauge({
  sentiment,
  sentimentScore,
  className,
}: SentimentGaugeProps) {
  // Normalize score (-1 to 1) into percentage (0 to 100)
  const normalizedPercent = Math.round(((sentimentScore + 1) / 2) * 100);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-[#d97706]">
            <Heart className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Sentiment & Emotional Valence</CardTitle>
            <p className="text-[11px] text-[#607264]">
              Acoustic pitch analysis + vocal stress and lexical tone profiling
            </p>
          </div>
        </div>
      </CardHeader>

      <div className="mt-4 space-y-4">
        {/* Spectrum Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {sentimentSpectrum.map((s) => {
            const isCurrent = s.label.toLowerCase() === sentiment.toLowerCase();
            return (
              <div
                key={s.label}
                className={cn(
                  "p-2 rounded-xl text-center border flex flex-col items-center gap-1 transition-all",
                  isCurrent
                    ? `${s.badgeBg} shadow-xs font-bold scale-105 z-10`
                    : "bg-[#f7f9f6] border-[#e2e8e0] text-[#607264] opacity-60"
                )}
              >
                {s.icon}
                <span className="text-[10px] tracking-tight">{s.displayName}</span>
              </div>
            );
          })}
        </div>

        {/* Continuous Bar Gauge */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-red-600 font-semibold">Distressed (-1.0)</span>
            <span className="text-[#142019] font-bold">
              Score: {sentimentScore > 0 ? `+${sentimentScore.toFixed(2)}` : sentimentScore.toFixed(2)}
            </span>
            <span className="text-[#059669] font-semibold">Calm (+1.0)</span>
          </div>

          <div className="relative h-2.5 w-full bg-[#edf2ec] rounded-full overflow-hidden border border-[#e2e8e0]">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 opacity-70" />
            {/* Indicator Needle */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-[#142019] shadow-sm rounded-full transition-all duration-300"
              style={{ left: `calc(${normalizedPercent}% - 4px)` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
