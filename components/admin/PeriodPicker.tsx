"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

export type PeriodKey = 'this_month' | 'last_month' | '3_months' | '6_months' | 'this_year' | 'custom';

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '3_months', label: 'Last 3 Months' },
  { key: '6_months', label: 'Last 6 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

function getPresetRange(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (key) {
    case 'this_month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: today };
    }
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: lastMonth.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0],
      };
    }
    case '3_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: from.toISOString().split('T')[0], to: today };
    }
    case '6_months': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from: from.toISOString().split('T')[0], to: today };
    }
    case 'this_year': {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }
    default:
      return { from: today, to: today };
  }
}

interface PeriodPickerProps {
  value: PeriodRange;
  onChange: (period: PeriodRange) => void;
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCustom(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectPreset(key: PeriodKey) {
    if (key === 'custom') {
      setShowCustom(true);
      return;
    }
    const range = getPresetRange(key);
    const label = PRESETS.find(p => p.key === key)!.label;
    onChange({ key, label, ...range });
    setIsOpen(false);
    setShowCustom(false);
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ key: 'custom', label: `${customFrom} → ${customTo}`, from: customFrom, to: customTo });
      setIsOpen(false);
      setShowCustom(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 active:scale-95"
      >
        <CalendarDays className="w-4 h-4 text-green-400" />
        <span>{value.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-2 right-0 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
          {!showCustom ? (
            <div className="py-1">
              {PRESETS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    value.key === key
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Custom Range</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-500 border border-green-500/30 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function getDefaultPeriod(): PeriodRange {
  const range = getPresetRange('this_month');
  return { key: 'this_month', label: 'This Month', ...range };
}
