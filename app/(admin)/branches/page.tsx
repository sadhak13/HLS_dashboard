"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AddBranchModal } from '@/components/admin/AddBranchModal';
import { AddBatchModal } from '@/components/admin/AddBatchModal';
import { EditBranchModal } from '@/components/admin/EditBranchModal';
import { EditBatchModal } from '@/components/admin/EditBatchModal';
import { MapPin, Plus, Clock, ChevronRight, Users, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Database } from '@/types/database.types';

type Branch = Database['public']['Tables']['branches']['Row'];
type Batch = Database['public']['Tables']['batches']['Row'];

interface BranchWithBatches extends Branch {
  batches: Batch[];
}

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

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchWithBatches[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBranchForBatch, setSelectedBranchForBatch] = useState<Branch | null>(null);
  
  // Edit Modals
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<Branch | null>(null);
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false);
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<Batch | null>(null);
  const [selectedBranchForEditBatch, setSelectedBranchForEditBatch] = useState<Branch | null>(null);

  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  // Player count maps: branchId → count, batchId → count
  const [playersByBranch, setPlayersByBranch] = useState<Record<string, number>>({});
  const [playersByBatch, setPlayersByBatch] = useState<Record<string, number>>({});

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const supabase = createClient();

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);

    // Fetch branches, batches, and active players in parallel
    const [
      { data: branchData, error: branchError },
      { data: batchData },
      { data: playerData },
    ] = await Promise.all([
      supabase.from('branches').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('batches').select('*').order('start_time', { ascending: true }),
      (supabase as any)
        .from('players')
        .select('branch_id, batch_id')
        .eq('status', 'active'),
    ]);

    if (!branchData || branchError) {
      setIsLoading(false);
      return;
    }

    // Build batch-per-branch map
    const batchesByBranch: Record<string, Batch[]> = {};
    (batchData ?? []).forEach((batch: Batch) => {
      if (!batchesByBranch[batch.branch_id]) batchesByBranch[batch.branch_id] = [];
      batchesByBranch[batch.branch_id].push(batch);
    });

    // Count active players per branch and per batch
    const byBranch: Record<string, number> = {};
    const byBatch: Record<string, number> = {};
    (playerData ?? []).forEach((p: { branch_id: string; batch_id: string | null }) => {
      byBranch[p.branch_id] = (byBranch[p.branch_id] ?? 0) + 1;
      if (p.batch_id) {
        byBatch[p.batch_id] = (byBatch[p.batch_id] ?? 0) + 1;
      }
    });

    const branchesWithBatches: BranchWithBatches[] = (branchData as Branch[]).map((branch) => ({
      ...branch,
      batches: batchesByBranch[branch.id] || [],
    }));

    setBranches(branchesWithBatches);
    setPlayersByBranch(byBranch);
    setPlayersByBatch(byBatch);
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const toggleExpand = (branchId: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const openBatchModal = (branch: Branch) => {
    setSelectedBranchForBatch(branch);
    setIsBatchModalOpen(true);
  };

  const totalBatches = branches.reduce((sum, b) => sum + b.batches.length, 0);
  const totalActivePlayers = Object.values(playersByBranch).reduce((s, c) => s + c, 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Branches &amp; Batches
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
            {' · '}
            {totalBatches} {totalBatches === 1 ? 'batch' : 'batches'}
          </p>
        </div>
        {!isLoading && branches.length > 0 && isAdmin && (
          <button
            onClick={() => setIsBranchModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/25 border border-green-500/30 transition-all duration-200 active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      {/* ── Stats Bar ── */}
      {!isLoading && branches.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Branches</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{branches.length}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Batches</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalBatches}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalActivePlayers}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && branches.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">No branches yet</p>
            <p className="text-sm text-gray-400">Get started by adding your first branch location.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/25 border border-green-500/30 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          )}
        </div>
      )}

      {/* ── Branch Cards ── */}
      {!isLoading && (
        <div className="space-y-3">
          {branches.map((branch) => {
            const isExpanded = expandedBranches.has(branch.id);
            const branchPlayerCount = playersByBranch[branch.id] ?? 0;

            return (
              <div
                key={branch.id}
                className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
              >
                {/* Branch Header Row */}
                <div
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors cursor-pointer select-none"
                  onClick={() => toggleExpand(branch.id)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    </div>
                    {/* Name + location */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                          {branch.name}
                        </h3>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBranchForEdit(branch);
                              setIsEditBranchModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-green-400 hover:bg-white/10 transition-all duration-250 active:scale-90"
                            title="Edit Branch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">{branch.location}</p>
                    </div>
                  </div>

                  {/* Right: pills + chevron */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {/* Active students badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      <Users className="w-3 h-3" />
                      {branchPlayerCount}
                      <span className="hidden sm:inline">
                        {branchPlayerCount === 1 ? ' student' : ' students'}
                      </span>
                    </span>
                    {/* Batch count badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.06] border border-white/10 text-gray-300">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {branch.batches.length}
                      <span className="hidden sm:inline">
                        {branch.batches.length === 1 ? ' batch' : ' batches'}
                      </span>
                    </span>
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Expandable Batches Section */}
                {isExpanded && (
                  <div className="border-t border-white/[0.07]">
                    {branch.batches.length === 0 ? (
                      /* No batches yet */
                      <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-300">No batches yet</p>
                          <p className="text-xs text-gray-500 mt-0.5">Add a batch to schedule training sessions.</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); openBatchModal(branch); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all duration-200 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Batch
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Batch list */}
                        <div className="divide-y divide-white/[0.05]">
                          {branch.batches.map((batch) => {
                            const batchCount = playersByBatch[batch.id] ?? 0;
                            return (
                              <div
                                key={batch.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3.5 gap-2 sm:gap-4 hover:bg-white/[0.03] transition-colors"
                              >
                                {/* Left: icon + name + time */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-white truncate">{batch.name}</p>
                                    <p className="text-xs text-gray-400">
                                      {formatTime(batch.start_time)} – {formatTime(batch.end_time)}
                                    </p>
                                  </div>
                                </div>

                                {/* Right: student count + day pills + edit batch button */}
                                <div className="flex items-center flex-wrap gap-2 pl-11 sm:pl-0">
                                  {/* Student count pill */}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300 whitespace-nowrap">
                                    <Users className="w-2.5 h-2.5" />
                                    {batchCount} {batchCount === 1 ? 'student' : 'students'}
                                  </span>
                                  {/* Day pills */}
                                  {batch.days_of_week.map((day) => (
                                    <span
                                      key={day}
                                      className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-green-500/10 border border-green-500/20 text-green-400"
                                    >
                                      {DAYS_SHORT[day] || day}
                                    </span>
                                  ))}
                                  {/* Edit Batch button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBatchForEdit(batch);
                                      setSelectedBranchForEditBatch(branch);
                                      setIsEditBatchModalOpen(true);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-all duration-250 active:scale-90 ml-1"
                                    title="Edit Batch"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add batch footer */}
                        <div className="px-4 sm:px-5 py-3 border-t border-white/[0.05] bg-white/[0.02]">
                          <button
                            onClick={(e) => { e.stopPropagation(); openBatchModal(branch); }}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition-all duration-200 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Batch to {branch.name}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modals */}
      <AddBranchModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        onSuccess={fetchBranches}
      />

      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => { setIsBatchModalOpen(false); setSelectedBranchForBatch(null); }}
        onSuccess={fetchBranches}
        branch={selectedBranchForBatch}
      />

      {/* Edit Modals */}
      <EditBranchModal
        isOpen={isEditBranchModalOpen}
        onClose={() => { setIsEditBranchModalOpen(false); setSelectedBranchForEdit(null); }}
        onSuccess={fetchBranches}
        branch={selectedBranchForEdit}
      />

      <EditBatchModal
        isOpen={isEditBatchModalOpen}
        onClose={() => { setIsEditBatchModalOpen(false); setSelectedBatchForEdit(null); setSelectedBranchForEditBatch(null); }}
        onSuccess={fetchBranches}
        branch={selectedBranchForEditBatch}
        batch={selectedBatchForEdit}
      />
    </div>
  );
}
