"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export interface FeeRecord {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  mode_of_payment: 'cash' | 'online' | 'cash+online' | null;
  paid_date: string | null;
  players: { full_name: string; branch_id: string } | null;
  branches: { name: string } | null;
}

interface EditFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fee: FeeRecord | null;
}

export function EditFeeModal({ isOpen, onClose, onSuccess, fee }: EditFeeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [modeOfPayment, setModeOfPayment] = useState<'cash' | 'online' | 'cash+online' | ''>('');
  const [paidDate, setPaidDate] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && fee) {
      setAmount(fee.amount.toString());
      setStatus(fee.status);
      setModeOfPayment(fee.mode_of_payment || '');
      setPaidDate(fee.paid_date ? new Date(fee.paid_date).toISOString().split('T')[0] : '');
      setError('');
    }
  }, [isOpen, fee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee) return;
    
    setError('');
    setIsLoading(true);

    try {
      const updateData: any = {
        amount: parseFloat(amount),
        status,
        mode_of_payment: modeOfPayment === '' ? null : modeOfPayment,
      };

      if (status === 'paid') {
        updateData.paid_date = paidDate ? new Date(paidDate).toISOString() : new Date().toISOString();
      } else {
        updateData.paid_date = null;
      }

      const { error: updateError } = await (supabase as any)
        .from('fees')
        .update(updateData)
        .eq('id', fee.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update fee record');
    } finally {
      setIsLoading(false);
    }
  };

  if (!fee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Fee Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md mb-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{fee.players?.full_name}</span> 
            {' '}— {fee.month}
          </p>
        </div>

        <div>
          <Input
            type="number"
            label="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {status === 'paid' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mode of Payment
              </label>
              <select
                value={modeOfPayment}
                onChange={(e) => setModeOfPayment(e.target.value as any)}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="">Select mode...</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cash+online">Cash + Online</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paid On
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
