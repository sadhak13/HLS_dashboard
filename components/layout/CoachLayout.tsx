"use client";

import React from 'react';
import Image from 'next/image';
import { BottomNav } from './BottomNav';
import { CoachSidebar } from './CoachSidebar';
import { Bell } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

export function CoachLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <CoachSidebar />

      <div className="relative flex flex-1 flex-col w-full overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden flex items-center gap-3 text-base font-bold text-gray-900 dark:text-white">
            <Image 
              src="/HLS_logo.png" 
              alt="HLS Soccer Academy Logo" 
              width={32} 
              height={32} 
              className="object-contain"
            />
            Coach
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Bell className="h-5 w-5" />
            </button>
            <UserDropdown />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
        
        <BottomNav />
      </div>
    </div>
  );
}
