"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createCoachAccount } from '@/app/(admin)/coaches/actions';
import { createClient } from '@/lib/supabase/client';

interface AddCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCoachModal({ isOpen, onClose, onSuccess }: AddCoachModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchBranches = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('branches').select('id, name').order('name');
        if (data) setBranches(data);
      };
      fetchBranches();
      setSuccessMsg('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createCoachAccount(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSuccessMsg(`Account created! Coach can log in with Email: ${result.email} and Password: ${result.password}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create coach account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provision Coach Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md dark:bg-green-900/30 dark:text-green-400">
            {successMsg}
          </div>
        )}
        
        <div>
          <Input label="Full Name" name="fullName" placeholder="e.g. John Doe" required disabled={!!successMsg} />
        </div>
        
        <div>
          <Input type="email" label="Email Address" name="email" placeholder="e.g. john@academy.com" required disabled={!!successMsg} />
        </div>

        <div>
          <Input type="tel" label="Phone Number" name="phone" placeholder="e.g. +91 9876543210" disabled={!!successMsg} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Branch</label>
          <select 
            name="branchId" 
            required
            disabled={!!successMsg}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">Select a branch...</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {!successMsg && (
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Account
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
