"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/app/(auth)/login/actions';

export function UserDropdown() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = profile?.full_name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold shrink-0">
          {initials}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block max-w-[120px] truncate">
          {profile?.full_name ?? 'Loading...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 overflow-hidden z-50 animate-fadeIn">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {profile?.full_name ?? '...'}
            </p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
              {profile?.role === 'ADMIN' ? 'Admin' : 'Coach'}
            </span>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/change-password"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-gray-400" />
              Change Password
            </Link>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

            <button
              onClick={() => { setIsOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
