"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CheckSquare, IndianRupee } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/coach-dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/my-attendance', icon: CheckSquare },
  { name: 'Players', href: '/my-players', icon: Users },
  { name: 'Fees', href: '/my-fees', icon: IndianRupee },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive 
                  ? 'text-green-600 dark:text-green-500' 
                  : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-green-100/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
