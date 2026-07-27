"use client";

import React, { useState } from 'react';
import { CoachSidebar } from './CoachSidebar';
import { TopBar } from './TopBar';

export function CoachLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div data-layout="shell" className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <CoachSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="relative flex flex-col flex-1 w-full overflow-hidden">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
