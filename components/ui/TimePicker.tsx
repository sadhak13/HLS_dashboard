"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // "HH:MM" in 24hr format
  onChange: (value: string) => void;
  className?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function to12Hour(hour24: number) {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: 'AM' | 'PM') {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hour24 = value ? parseInt(value.split(':')[0]) : -1;
  const minute = value ? parseInt(value.split(':')[1]) : -1;
  const { hour12, period } = hour24 >= 0 ? to12Hour(hour24) : { hour12: -1, period: 'AM' as const };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function emitChange(h12: number, m: number, p: 'AM' | 'PM') {
    const h24 = to24Hour(h12, p);
    onChange(`${pad(h24)}:${pad(m)}`);
  }

  function incrementHour() {
    const h = hour12 <= 0 ? 12 : hour12 >= 12 ? 1 : hour12 + 1;
    const p = period as 'AM' | 'PM';
    emitChange(h, minute <= 0 ? 0 : minute, p);
  }

  function decrementHour() {
    const h = hour12 <= 1 ? 12 : hour12 - 1;
    const p = period as 'AM' | 'PM';
    emitChange(h, minute <= 0 ? 0 : minute, p);
  }

  function incrementMinute() {
    const m = minute < 0 ? 0 : minute >= 59 ? 0 : minute + 1;
    const h = hour12 <= 0 ? 12 : hour12;
    emitChange(h, m, period as 'AM' | 'PM');
  }

  function decrementMinute() {
    const m = minute <= 0 ? 59 : minute - 1;
    const h = hour12 <= 0 ? 12 : hour12;
    emitChange(h, m, period as 'AM' | 'PM');
  }

  function togglePeriod() {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    const h = hour12 <= 0 ? 12 : hour12;
    const m = minute <= 0 ? 0 : minute;
    emitChange(h, m, newPeriod);
  }

  const displayText = hour12 > 0 && minute >= 0
    ? `${pad(hour12)}:${pad(minute)} ${period}`
    : '--:--';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Display field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200 flex items-center justify-between"
      >
        <span className={hour12 > 0 ? 'text-white' : 'text-gray-500'}>{displayText}</span>
        <Clock className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown picker */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 min-w-[180px]">
          <div className="flex items-center gap-2">
            {/* Hour column */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementHour}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.08] border border-white/10 text-white font-semibold text-sm">
                {hour12 > 0 ? pad(hour12) : '--'}
              </div>
              <button
                type="button"
                onClick={decrementHour}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Separator */}
            <span className="text-white font-bold text-lg mt-[-2px]">:</span>

            {/* Minute column */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementMinute}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/[0.08] border border-white/10 text-white font-semibold text-sm">
                {minute >= 0 ? pad(minute) : '--'}
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* AM/PM toggle */}
            <div className="flex flex-col items-center gap-1 ml-1">
              <button
                type="button"
                onClick={togglePeriod}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-xs">
                {period}
              </div>
              <button
                type="button"
                onClick={togglePeriod}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
