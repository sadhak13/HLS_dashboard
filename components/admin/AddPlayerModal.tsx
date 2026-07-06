"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { createAdminPlayer, updateAdminPlayer } from '@/app/(admin)/players/actions';
import type { Database } from '@/types/database.types';

type Player = Database['public']['Tables']['players']['Row'];

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // On create: passes the newly created player back for fees popup
  onSuccess: (newPlayer?: Player) => void;
  editingPlayer?: Player | null;
}

export function AddPlayerModal({ isOpen, onClose, onSuccess, editingPlayer }: AddPlayerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'dropped'>('active');
  const [enrolledDate, setEnrolledDate] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createClient();
  const isEditing = !!editingPlayer;

  useEffect(() => {
    if (isOpen) {
      // Fetch branches for dropdown
      const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name').order('name');
        if (data) setBranches(data);
      };
      fetchBranches();

      // Prefill form if editing
      if (editingPlayer) {
        setFullName(editingPlayer.full_name);
        setDob(editingPlayer.date_of_birth);
        setParentName(editingPlayer.parent_name);
        setParentPhone(editingPlayer.parent_phone);
        setBranchId(editingPlayer.branch_id);
        setStatus(editingPlayer.status as any);
        setEnrolledDate(editingPlayer.enrolled_date || new Date().toISOString().split('T')[0]);
      } else {
        setFullName('');
        setDob('');
        setParentName('');
        setParentPhone('');
        setBranchId('');
        setStatus('active');
        setEnrolledDate(new Date().toISOString().split('T')[0]);
      }
      setError('');
    }
  }, [isOpen, editingPlayer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('dob', dob);
    formData.append('parentName', parentName);
    formData.append('parentPhone', parentPhone);
    formData.append('branchId', branchId);
    formData.append('status', status);
    formData.append('enrolledDate', enrolledDate);

    try {
      if (isEditing && editingPlayer) {
        const result = await updateAdminPlayer(editingPlayer.id, formData);
        if (result.error) {
          setError(result.error);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        const result = await createAdminPlayer(formData);
        if (result.error) {
          setError(result.error);
        } else {
          // Pass the created player back so parent can open the fees modal
          onSuccess(result.player as Player);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save player');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Player' : 'Register New Player'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Full Name"
              placeholder="e.g. Mohammed Ali"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Include both first and last name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Branch
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Select a branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Parent / Guardian Name"
              placeholder="e.g. Ahmed Ali"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="tel"
              label="Parent Phone"
              placeholder="e.g. 9876543210"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Enrolled Date
            </label>
            <input
              type="date"
              value={enrolledDate}
              onChange={(e) => setEnrolledDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'dropped')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              {isEditing && <option value="dropped">Dropped</option>}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Register Player'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
