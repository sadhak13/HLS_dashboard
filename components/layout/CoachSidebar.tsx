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

export function CoachSidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/40 backdrop-blur-xl border-r border-white/[0.07] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b border-white/[0.07] bg-black/20">
          <div className="flex items-center gap-3 font-bold text-lg text-white">
            <Image
              src="/HLS_logo.png"
              alt="HLS Soccer Academy Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="truncate max-w-[140px]">HLS Coach</span>
          </div>
        </div>

        <div className="py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
