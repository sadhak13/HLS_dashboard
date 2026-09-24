"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { recordCoachSalaryChange } from '@/app/(admin)/coaches/actions';
import type { CoachSalaryHistoryEntry } from '@/types/app.types';
import { format } from 'date-fns';

interface SalaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coachId: string;
  coachName: string;
  history: CoachSalaryHistoryEntry[];
}

export function SalaryHistoryModal({ isOpen, onClose, onSuccess, coachId, coachName, history }: SalaryHistoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.effective_from.localeCompare(a.effective_from)),
    [history]
  );

  useEffect(() => {
    if (isOpen) {
      setError('');
      setMonthlySalary(sortedHistory[0] ? String(sortedHistory[0].monthly_salary) : '');
      setEffectiveFrom(format(new Date(), 'yyyy-MM'));
    }
  }, [isOpen, sortedHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('coachId', coachId);
    formData.append('monthlySalary', monthlySalary || '0');
    formData.append('effectiveFrom', effectiveFrom);

    const result = await recordCoachSalaryChange(formData);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Salary History — ${coachName}`}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {sortedHistory.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {sortedHistory.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <span className="text-gray-500 dark:text-gray-400">{format(new Date(`${entry.effective_from}-01`), 'MMMM yyyy')} onward</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{entry.monthly_salary.toLocaleString('en-IN')}/month</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No salary recorded yet.</p>
        )}

        <div className="h-px bg-gray-200 dark:bg-gray-700" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="number"
            label="New Monthly Salary (₹)"
            placeholder="e.g. 20000"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(e.target.value)}
            min="0"
            required
          />
          <Input
            type="month"
            label="Effective From"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Applies from this month onward — past months keep whatever was true then.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Record Change
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
