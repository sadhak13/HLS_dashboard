"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { updateCoachDetails, getCoachEmail } from '@/app/(admin)/coaches/actions';
import { createClient } from '@/lib/supabase/client';
import { Clock, MapPin, Plus, Trash2, AlertCircle } from 'lucide-react';

interface Batch {
  id: string;
  branch_id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
}

interface BranchWithBatches {
  id: string;
  name: string;
  location: string;
  batches: Batch[];
}

interface EditCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coach: {
    id: string;
    user_id: string;
    phone: string | null;
    email?: string | null;
    profiles: { full_name: string } | null;
    coach_batches: { batch_id: string }[];
  } | null;
}

const glassInputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/40 transition-all duration-200';

const glassLabelClass = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';

const DAYS_SHORT: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
};

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function hasTimeOverlap(
  a: { start_time: string; end_time: string; days_of_week: string[] },
  b: { start_time: string; end_time: string; days_of_week: string[] }
): boolean {
  const sharedDays = a.days_of_week.filter(d => b.days_of_week.includes(d));
  if (sharedDays.length === 0) return false;
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

export function EditCoachModal({ isOpen, onClose, onSuccess, coach }: EditCoachModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<BranchWithBatches[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [overlapWarning, setOverlapWarning] = useState('');

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (isOpen && coach) {
      const fetchData = async () => {
        const supabase = createClient();
        const { data: branchData } = await supabase.from('branches').select('id, name, location').order('name');
        const { data: batchData } = await (supabase as any).from('batches').select('*').order('start_time');

        if (branchData) {
          const grouped: BranchWithBatches[] = (branchData as Array<{ id: string; name: string; location: string }>).map((branch) => ({
            ...branch,
            batches: (batchData ?? []).filter((b: any) => b.branch_id === branch.id),
          }));
          setBranches(grouped);
          if (grouped.length > 0) {
            setSelectedBranchId(grouped[0].id);
          }
        }
      };
      fetchData();

      // Fetch email from auth
      getCoachEmail(coach.user_id).then(({ email: e }) => setEmail(e));

      setFullName(coach.profiles?.full_name || '');
      setPhone(coach.phone || '');
      setSelectedBatchIds(coach.coach_batches?.map(cb => cb.batch_id) || []);
      setError('');
      setOverlapWarning('');
    }
  }, [isOpen, coach]);

  const allBatches = branches.flatMap(b => b.batches.map(batch => ({ ...batch, branchName: b.name })));

  const activeBranch = branches.find(br => br.id === selectedBranchId);
  const activeBranchBatches = activeBranch?.batches ?? [];

  useEffect(() => {
    if (activeBranchBatches.length > 0) {
      setSelectedBatchId(activeBranchBatches[0].id);
    } else {
      setSelectedBatchId('');
    }
    setOverlapWarning('');
  }, [selectedBranchId, activeBranchBatches]);

  const handleAddBatch = () => {
    setOverlapWarning('');
    if (!selectedBatchId) return;

    if (selectedBatchIds.includes(selectedBatchId)) {
      setOverlapWarning('This batch is already assigned to this coach.');
      return;
    }

    const batch = allBatches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    const selectedBatches = allBatches.filter(b => selectedBatchIds.includes(b.id));
    for (const selected of selectedBatches) {
      if (hasTimeOverlap(batch, selected)) {
        const selectedBranch = branches.find(br => br.batches.some(bt => bt.id === selected.id));
        const newBranch = branches.find(br => br.batches.some(bt => bt.id === selectedBatchId));
        if (selectedBranch?.id !== newBranch?.id) {
          setOverlapWarning(
            `"${batch.name}" at ${newBranch?.name} overlaps with "${selected.name}" at ${selectedBranch?.name} on shared days.`
          );
          return;
        }
      }
    }

    setSelectedBatchIds(prev => [...prev, selectedBatchId]);
    setSelectedBatchId(activeBranchBatches.find(b => !selectedBatchIds.includes(b.id) && b.id !== selectedBatchId)?.id || '');
  };

  const handleRemoveBatch = (batchId: string) => {
    setSelectedBatchIds(prev => prev.filter(id => id !== batchId));
    setOverlapWarning('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!coach) return;

    if (selectedBatchIds.length === 0) {
      setError('At least one batch must be assigned');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('coachId', coach.id);
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('batchIds', JSON.stringify(selectedBatchIds));

    try {
      const result = await updateCoachDetails(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update coach');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Coach Details" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {overlapWarning && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-400">{overlapWarning}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={glassLabelClass}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
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
              placeholder="e.g. john@academy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={glassInputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={glassLabelClass}>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={glassInputClass}
            />
          </div>
        </div>

        <div className="h-px bg-white/[0.07]" />

        <div>
          <label className={glassLabelClass}>Assign Batches</label>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Branch Location
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={branches.length === 0}
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

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Select Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={activeBranchBatches.length === 0}
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer [color-scheme:dark]"
              >
                {activeBranchBatches.length === 0 && (
                  <option value="" className="bg-slate-900">No Batches Available</option>
                )}
                {activeBranchBatches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name} ({formatTime(b.start_time)} – {formatTime(b.end_time)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddBatch}
              disabled={!selectedBatchId}
              className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 border border-green-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus className="w-4 h-4" />
              Assign Batch
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Assigned Batches ({selectedBatchIds.length})
            </h4>

            {selectedBatchIds.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">No batches assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {selectedBatchIds.map((id) => {
                  const b = allBatches.find(batch => batch.id === id);
                  if (!b) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">{b.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {b.branchName} • {formatTime(b.start_time)} – {formatTime(b.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex gap-1 mr-2">
                          {b.days_of_week.map((d) => (
                            <span key={d} className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20">
                              {DAYS_SHORT[d] || d}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatch(id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
