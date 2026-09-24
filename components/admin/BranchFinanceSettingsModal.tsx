"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { recordBranchFinanceRevision } from '@/app/(admin)/expenses/actions';
import type { BranchFinanceRevision } from '@/types/app.types';
import type { RentType } from '@/lib/finance';
import { format } from 'date-fns';

interface BranchFinanceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
  branchName: string;
  history: BranchFinanceRevision[];
}

export function BranchFinanceSettingsModal({ isOpen, onClose, onSuccess, branchId, branchName, history }: BranchFinanceSettingsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rentType, setRentType] = useState<RentType>('fixed');
  const [rentValue, setRentValue] = useState('');
  const [standardFee, setStandardFee] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.effective_from.localeCompare(a.effective_from)),
    [history]
  );
  const latest = sortedHistory[0] ?? null;

  useEffect(() => {
    if (isOpen) {
      setError('');
      setRentType(latest?.rent_type ?? 'fixed');
      setRentValue(latest ? String(latest.rent_value) : '');
      setStandardFee(latest ? String(latest.standard_fee_per_student) : '');
      setEffectiveFrom(format(new Date(), 'yyyy-MM'));
    }
  }, [isOpen, latest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('branchId', branchId);
    formData.append('rentType', rentType);
    formData.append('rentValue', rentValue || '0');
    formData.append('standardFeePerStudent', standardFee || '0');
    formData.append('effectiveFrom', effectiveFrom);

    const result = await recordBranchFinanceRevision(formData);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rent & Fee Settings — ${branchName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rent Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRentType('fixed')}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${rentType === 'fixed'
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              Fixed amount
            </button>
            <button
              type="button"
              onClick={() => setRentType('percentage')}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${rentType === 'percentage'
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              % of revenue
            </button>
          </div>
        </div>

        <Input
          type="number"
          label={rentType === 'fixed' ? 'Monthly Rent (₹)' : 'Ground\'s Share (%)'}
          placeholder={rentType === 'fixed' ? 'e.g. 100000' : 'e.g. 40'}
          value={rentValue}
          onChange={(e) => setRentValue(e.target.value)}
          min="0"
          max={rentType === 'percentage' ? '100' : undefined}
          required
        />

        <Input
          type="number"
          label="Standard Fee per Student (₹/month)"
          placeholder="e.g. 2000"
          value={standardFee}
          onChange={(e) => setStandardFee(e.target.value)}
          min="0"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Used only to project break-even student count — actual fees can still vary per player.
        </p>

        <Input
          type="month"
          label="Effective From"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Applies from this month onward — months before it keep whatever was set for them.
        </p>

        {sortedHistory.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Revision History
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {sortedHistory.map((rev) => (
                <div key={rev.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-gray-500 dark:text-gray-400">{format(new Date(`${rev.effective_from}-01`), 'MMMM yyyy')} onward</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {rev.rent_type === 'fixed' ? `₹${rev.rent_value.toLocaleString('en-IN')}` : `${rev.rent_value}%`} rent · ₹{rev.standard_fee_per_student.toLocaleString('en-IN')}/student
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Revision
          </Button>
        </div>
      </form>
    </Modal>
  );
}
