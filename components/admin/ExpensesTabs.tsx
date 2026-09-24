"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { name: 'Overview', href: '/expenses' },
  { name: 'Forecast', href: '/expenses/forecast' },
];

export function ExpensesTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
