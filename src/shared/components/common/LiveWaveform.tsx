"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";

export interface LiveWaveformProps {
  isPlaying?: boolean;
  barsCount?: number;
  variant?: "cyan" | "purple" | "rose" | "emerald" | "teal";
  className?: string;
}

export function LiveWaveform({
  isPlaying = true,
  barsCount = 28,
  variant = "cyan",
  className,
}: LiveWaveformProps) {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    // Generate initial randomized heights
    const initial = Array.from({ length: barsCount }, () => Math.floor(Math.random() * 26) + 6);
    setHeights(initial);

    if (!isPlaying) return;

    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map(() => Math.floor(Math.random() * 32) + 4)
      );
    }, 180);

    return () => clearInterval(interval);
  }, [isPlaying, barsCount]);

  const colorVariants = {
    cyan: "bg-gradient-to-t from-[#0d9488] to-[#2dd4bf]",
    teal: "bg-gradient-to-t from-[#0d9488] to-[#2dd4bf]",
    emerald: "bg-gradient-to-t from-[#059669] to-[#34d399]",
    purple: "bg-gradient-to-t from-[#1b4332] to-[#2d6a4f]",
    rose: "bg-gradient-to-t from-[#dc2626] to-[#f87171]",
  };

  return (
    <div className={cn("flex items-center gap-[3px] h-9 px-2", className)}>
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-150 ease-out",
            colorVariants[variant],
            !isPlaying && "!h-1 bg-slate-700 shadow-none opacity-40"
          )}
          style={{ height: isPlaying ? `${h}px` : "4px" }}
        />
      ))}
    </div>
  );
}
