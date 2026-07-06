"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Users, IndianRupee } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/coach-dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/my-attendance', icon: CheckSquare },
  { name: 'Players', href: '/my-players', icon: Users },
  { name: 'Fees', href: '/my-fees', icon: IndianRupee },
];

export function CoachSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-800 bg-gray-900 text-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center justify-center border-b border-gray-800 bg-gray-950 px-4">
        <div className="flex items-center gap-3">
          <Image 
            src="/HLSSA_logo.png" 
            alt="HLS Soccer Academy Logo" 
            width={32} 
            height={32} 
            className="object-contain"
          />
          <span className="truncate text-base font-bold">HLS Coach</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
