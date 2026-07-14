"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, MapPin, Navigation } from 'lucide-react';
import type { Database } from '@/types/database.types';

type Branch = Database['public']['Tables']['branches']['Row'];

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch: Branch | null;
}

const glassInputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200';

const glassLabelClass = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

export function EditBranchModal({ isOpen, onClose, onSuccess, branch }: EditBranchModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && branch) {
      setName(branch.name);
      setLocation(branch.location);
      setError('');
    }
  }, [isOpen, branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    setError('');
    setIsLoading(true);

    try {
      const { error: submitError } = await (supabase as any)
        .from('branches')
        .update({ name, location })
        .eq('id', branch.id);

      if (submitError) throw submitError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update branch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Branch">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label className={glassLabelClass}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Branch Name
            </span>
          </label>
          <input
            type="text"
            placeholder="e.g. Gachibowli Campus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={glassInputClass}
          />
        </div>

        <div>
          <label className={glassLabelClass}>
            <span className="inline-flex items-center gap-1.5">
              <Navigation className="w-3 h-3" />
              Location / Area
            </span>
          </label>
          <input
            type="text"
            placeholder="e.g. Gachibowli, Hyderabad"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className={glassInputClass}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.07]" />

        {/* Actions */}
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
