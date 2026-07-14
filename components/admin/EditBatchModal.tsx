"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import { Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';

type Branch = Database['public']['Tables']['branches']['Row'];
type Batch = Database['public']['Tables']['batches']['Row'];

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch: Branch | null;
  batch: Batch | null;
}

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const glassInputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200';

const glassLabelClass = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

export function EditBatchModal({ isOpen, onClose, onSuccess, branch, batch }: EditBatchModalProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && batch) {
      setName(batch.name);
      // Format start_time/end_time from "HH:MM:SS" or similar to "HH:MM"
      setStartTime(batch.start_time ? batch.start_time.substring(0, 5) : '');
      setEndTime(batch.end_time ? batch.end_time.substring(0, 5) : '');
      setSelectedDays(batch.days_of_week || []);
      setError('');
    }
  }, [isOpen, batch]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const selectWeekdays = () => {
    setSelectedDays(['mon', 'tue', 'wed', 'thu', 'fri']);
  };

  const selectAll = () => {
    setSelectedDays(DAYS.map(d => d.key));
  };

  const clearDays = () => {
    setSelectedDays([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setError('');

    if (!name.trim()) {
      setError('Batch name is required');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start and end time are required');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }
    if (selectedDays.length === 0) {
      setError('Select at least one training day');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await (supabase as any)
        .from('batches')
        .update({
          name: name.trim(),
          start_time: startTime,
          end_time: endTime,
          days_of_week: selectedDays,
        })
        .eq('id', batch.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Batch${branch ? ` in ${branch.name}` : ''}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Batch Name */}
        <div>
          <label className={glassLabelClass}>Batch Name</label>
          <input
            type="text"
            placeholder="e.g. Evening 4:30 – 5:30 PM"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={glassInputClass}
          />
        </div>

        {/* Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={glassLabelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Start Time
              </span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className={glassInputClass + ' [color-scheme:dark]'}
            />
          </div>
          <div>
            <label className={glassLabelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                End Time
              </span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className={glassInputClass + ' [color-scheme:dark]'}
            />
          </div>
        </div>

        {/* Training Days */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={glassLabelClass + ' mb-0'}>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Training Days
              </span>
            </label>
            {/* Quick-select links */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectWeekdays}
                className="text-[11px] font-medium text-green-400 hover:text-green-300 transition-colors"
              >
                Weekdays
              </button>
              <span className="text-gray-600">·</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-medium text-green-400 hover:text-green-300 transition-colors"
              >
                All
              </button>
              {selectedDays.length > 0 && (
                <>
                  <span className="text-gray-600">·</span>
                  <button
                    type="button"
                    onClick={clearDays}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Day Pills */}
          <div className="flex gap-1.5">
            {DAYS.map(({ key, label }) => {
              const isSelected = selectedDays.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 border border-green-400/50'
                      : 'bg-white/[0.04] border border-white/10 text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Selection count */}
          {selectedDays.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.07]" />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-gray-200 transition-all duration-200 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20 border border-green-500/30 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
