"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFeeModal({ isOpen, onClose, onSuccess }: AddFeeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<{ id: string; full_name: string; branch_id: string; branches: { name: string } | null }[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState<'cash' | 'online' | 'cash+online'>('cash');

  const supabase = createClient();

  // Default month to current month
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setMonth(currentMonth);
      setError('');
      setPlayerId('');
      setAmount('');
      setModeOfPayment('cash');

      const fetchPlayers = async () => {
        const { data } = await supabase
          .from('players')
          .select('id, full_name, branch_id, branches(name)')
          .eq('status', 'active')
          .order('full_name');
        if (data) setPlayers(data as any);
      };
      fetchPlayers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const selectedPlayer = players.find((p) => p.id === playerId);
    if (!selectedPlayer) {
      setError('Please select a player.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: insertError } = await (supabase as any).from('fees').insert({
        player_id: playerId,
        branch_id: selectedPlayer.branch_id,
        month,
        amount: parseFloat(amount),
        status: 'pending',
        mode_of_payment: modeOfPayment,
      } as any);

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A fee record for this player and month already exists.');
        }
        throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create fee record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Fee Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Player
          </label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">Select a player...</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} — {p.branches?.name ?? 'Unknown Branch'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <Input
            type="number"
            label="Amount (₹)"
            placeholder="e.g. 1500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mode of Payment
          </label>
          <select
            value={modeOfPayment}
            onChange={(e) => setModeOfPayment(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cash+online">Cash + Online</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
