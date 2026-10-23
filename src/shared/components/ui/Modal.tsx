"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw] h-[90vh]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#142019]/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full rounded-2xl bg-white border border-[#e2e8df] p-6 shadow-xl z-10 transition-all text-[#142019]",
          "animate-in fade-in-50 zoom-in-95 duration-200",
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between pb-4 border-b border-[#edf2ea] mb-5">
            <div className="space-y-1 pr-6">
              {title && (
                typeof title === "string" ? (
                  <h3 className="text-lg font-bold text-[#142019] tracking-tight">{title}</h3>
                ) : (
                  <div>{title}</div>
                )
              )}
              {description && <p className="text-xs text-[#627267]">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#627267] hover:text-[#142019] hover:bg-[#f0f4ef] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
