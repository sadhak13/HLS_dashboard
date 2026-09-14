"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createManagerAccount } from '@/app/(admin)/managers/actions';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  location: string;
}

interface AddManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const glassInputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200';

const glassLabelClass = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

export function AddManagerModal({ isOpen, onClose, onSuccess }: AddManagerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchBranches = async () => {
        const supabase = createClient();
        const { data } = await (supabase as any).from('branches').select('id, name, location').order('name');
        if (data) {
          setBranches(data);
          if (data.length > 0) setBranchId(data[0].id);
        }
      };
      fetchBranches();
      setCreatedCredentials(null);
      setCopied(false);
      setError('');
      setFullName('');
      setEmail('');
      setPhone('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!branchId) {
      setError('Please select a branch');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('branchId', branchId);

    try {
      const result = await createManagerAccount(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      setCreatedCredentials({ email: result.email!, password: result.password! });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create manager account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdCredentials) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Manager Account Created" maxWidth="md">
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-medium text-green-400 mb-3">
              Account created successfully! Share these credentials with the manager:
            </p>
            <div className="space-y-2 bg-black/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Email</span>
                <span className="text-sm text-white font-mono">{createdCredentials.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Password</span>
                <span className="text-sm text-white font-mono">{createdCredentials.password}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-amber-400/80">
            This password will not be shown again. Make sure to copy or share it before closing.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all duration-200 active:scale-95"
            >
              {copied ? 'Copied!' : 'Copy Credentials'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 border border-green-500/30 transition-all duration-200 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provision Manager Account" maxWidth="md">
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
              {branches.length === 0 && <option value="" className="bg-slate-900">No Branches Available</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">
                  {b.name} ({b.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          A manager oversees every batch in their assigned branch — no individual batch assignment is needed.
        </p>

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
            Create Account
          </button>
        </div>
      </form>
    </Modal>
  );
}
