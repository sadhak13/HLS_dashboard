"use client";

import React from 'react';
import { ABSENCE_REASON_CATEGORIES, ABSENCE_REASON_LABELS } from '@/lib/validations';

interface AbsenceReasonFieldsProps {
  category: string;
  note: string;
  onCategoryChange: (category: string) => void;
  onNoteChange: (note: string) => void;
}

/** Controlled category + note fields for why a player was marked absent. Doesn't save anything itself — the caller owns state/timing. */
export function AbsenceReasonFields({ category, note, onCategoryChange, onNoteChange }: AbsenceReasonFieldsProps) {
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
      >
        <option value="">Reason (optional)</option>
        {ABSENCE_REASON_CATEGORIES.map((c) => (
          <option key={c} value={c}>{ABSENCE_REASON_LABELS[c]}</option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Note (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
      />
    </div>
  );
}
