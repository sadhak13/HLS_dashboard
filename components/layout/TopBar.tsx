"use client";

import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-black/30 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-400 rounded-lg lg:hidden hover:bg-white/10 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Search */}
        <div className="hidden lg:flex items-center relative">
          <Search className="w-4 h-4 absolute left-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-400 rounded-lg hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <UserDropdown />
      </div>
    </header>
  );
}
