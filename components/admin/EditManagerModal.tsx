"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { updateManagerDetails, getManagerEmail } from '@/app/(admin)/managers/actions';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  location: string;
}

interface EditManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  manager: {
    id: string;
    user_id: string;
    phone: string | null;
    branch_id: string;
    profiles: { full_name: string } | null;
  } | null;
}

const glassInputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200';

const glassLabelClass = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

export function EditManagerModal({ isOpen, onClose, onSuccess, manager }: EditManagerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    if (isOpen && manager) {
      const fetchBranches = async () => {
        const supabase = createClient();
        const { data } = await (supabase as any).from('branches').select('id, name, location').order('name');
        if (data) setBranches(data);
      };
      fetchBranches();

      getManagerEmail(manager.user_id).then(({ email: e }) => setEmail(e));

      setFullName(manager.profiles?.full_name || '');
      setPhone(manager.phone || '');
      setBranchId(manager.branch_id);
      setError('');
    }
  }, [isOpen, manager]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!manager) return;

    setIsLoading(true);

    const formData = new FormData();
    formData.append('managerId', manager.id);
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('branchId', branchId);

    try {
      const result = await updateManagerDetails(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update manager');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Manager Details" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={glassLabelClass}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={glassInputClass}
            />
          </div>
          <div>
            <label className={glassLabelClass}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. jane@academy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={glassInputClass}
            />
          </div>
          <div>
            <label className={glassLabelClass}>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={glassInputClass}
            />
          </div>
          <div>
            <label className={glassLabelClass}>Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={branches.length === 0}
              required
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer [color-scheme:dark]"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">
                  {b.name} ({b.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-white/[0.07]">
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
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20 border border-green-500/30 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
