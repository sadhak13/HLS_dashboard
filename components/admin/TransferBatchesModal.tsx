"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { transferBatches } from '@/app/(admin)/coaches/actions';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface Coach {
  id: string;
  profiles: { full_name: string } | null;
  status?: string;
  coach_batches: { batch_id: string; batches?: { name: string } }[];
}

interface TransferBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourceCoach: Coach | null;
  coaches: Coach[];
}

export function TransferBatchesModal({ isOpen, onClose, onSuccess, sourceCoach, coaches }: TransferBatchesModalProps) {
  const [targetCoachId, setTargetCoachId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const activeCoaches = coaches.filter(c => c.id !== sourceCoach?.id && c.status !== 'inactive');

  const handleTransfer = async () => {
    if (!sourceCoach || !targetCoachId) return;
    setError('');
    setIsLoading(true);

    try {
      const result = await transferBatches(sourceCoach.id, targetCoachId);
      if (result.error) {
        throw new Error(result.error);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer batches');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sourceCoach) return null;

  const sourceName = sourceCoach.profiles?.full_name || 'Unknown';
  const batchCount = sourceCoach.coach_batches?.length || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Batches" maxWidth="md">
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <p className="text-sm text-gray-300">
            Transfer all <strong className="text-white">{batchCount} batch{batchCount !== 1 ? 'es' : ''}</strong> from{' '}
            <strong className="text-white">{sourceName}</strong> to another coach.
          </p>
          {sourceCoach.coach_batches?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sourceCoach.coach_batches.map((cb: any) => (
                <span
                  key={cb.batch_id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                >
                  {cb.batches?.name || 'Batch'}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">From</p>
            <p className="text-sm font-medium text-white">{sourceName}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">To</p>
            <select
              value={targetCoachId}
              onChange={(e) => setTargetCoachId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer [color-scheme:dark]"
            >
              <option value="" className="bg-slate-900">Select coach...</option>
              {activeCoaches.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.profiles?.full_name || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-gray-200 transition-all duration-200 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={isLoading || !targetCoachId}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 border border-blue-500/30 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Transferring...' : 'Transfer Batches'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
