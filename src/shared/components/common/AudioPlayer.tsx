"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, FastForward } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { formatDuration } from "@/shared/utils/formatters";
import { LiveWaveform } from "./LiveWaveform";

export interface AudioPlayerProps {
  durationSeconds: number;
  initialPlaying?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export function AudioPlayer({
  durationSeconds,
  initialPlaying = false,
  onTimeUpdate,
  className,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1 * playbackRate;
          if (next >= durationSeconds) {
            setIsPlaying(false);
            return durationSeconds;
          }
          if (onTimeUpdate) onTimeUpdate(next);
          return next;
        });
      }, 1000 / playbackRate);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSeconds, playbackRate, onTimeUpdate]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (onTimeUpdate) onTimeUpdate(0);
  };
  const toggleSpeed = () => {
    setPlaybackRate((prev) => (prev === 1 ? 1.25 : prev === 1.25 ? 1.5 : 1));
  };

  const progressPercent = Math.min(100, (currentTime / (durationSeconds || 1)) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl p-4 bg-white border border-[#e2e8e0] shadow-sm flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Play / Reset controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="h-10 w-10 rounded-xl bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white font-bold flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-white text-white" /> : <Play className="h-5 w-5 fill-white text-white ml-0.5" />}
          </button>

          <button
            onClick={handleReset}
            title="Reset to start"
            className="h-8 w-8 rounded-lg text-[#607264] hover:text-[#142019] hover:bg-[#edf2ec] flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Live waveform center */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <LiveWaveform isPlaying={isPlaying} barsCount={36} variant="emerald" />
        </div>

        {/* Speed & volume indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSpeed}
            className="px-2 py-1 rounded-lg bg-[#f7f9f6] text-xs font-semibold text-[#1b4332] hover:bg-[#edf2ec] border border-[#e2e8e0] transition-colors cursor-pointer"
          >
            {playbackRate}x
          </button>
          <div className="hidden sm:flex items-center text-[#607264]">
            <Volume2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Progress scrubber */}
      <div className="space-y-1">
        <div
          className="relative h-2 w-full bg-[#edf2ec] rounded-full overflow-hidden cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const newTime = Math.floor(clickPos * durationSeconds);
            setCurrentTime(newTime);
            if (onTimeUpdate) onTimeUpdate(newTime);
          }}
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#059669] to-[#0d9488] rounded-full transition-all duration-100 group-hover:brightness-110"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-[#607264]">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span className="text-[#8fa394]">Duration: {formatDuration(durationSeconds)}</span>
        </div>
      </div>
    </div>
  );
}
