"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { LiveCallSimulatorModal } from "@/features/ai-intelligence/components/LiveCallSimulatorModal";
import { ProtectedRoute } from "@/features/platform/auth/ProtectedRoute";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-screen overflow-hidden bg-[#f7f9f6] text-[#142019] font-sans">
        {/* Sidebar */}
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Header */}
          <Header
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />

          {/* Dynamic Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {children}
          </main>
        </div>

        {/* Global Modals */}
        <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <LiveCallSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
