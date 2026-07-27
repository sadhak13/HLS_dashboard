"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PlayerTable } from '@/components/admin/PlayerTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { UserPlus2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

const AddPlayerModal = dynamic(() => import('@/components/shared/AddPlayerModal').then(m => ({ default: m.AddPlayerModal })), { ssr: false });
const AddFeesForNewPlayerModal = dynamic(() => import('@/components/coach/AddFeesForNewPlayerModal').then(m => ({ default: m.AddFeesForNewPlayerModal })), { ssr: false });
const DeletePlayerModal = dynamic(() => import('@/components/coach/DeletePlayerModal').then(m => ({ default: m.DeletePlayerModal })), { ssr: false });

type Player = Database['public']['Tables']['players']['Row'] & {
  branches?: { name: string } | null;
};

export default function PlayersPage() {
  const { showToast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; branch_id: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete modal state
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fees modal state (auto-opens after new player is created)
  const [newPlayerData, setNewPlayerData] = useState<{
    id: string;
    full_name: string;
    branch_id: string;
    enrolled_date: string;
  } | null>(null);
  const [showAddFeesModal, setShowAddFeesModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: branchData } = await supabase.from('branches').select('id, name').order('name');
      if (branchData) setBranches(branchData);

      const { data: batchData } = await (supabase as any).from('batches').select('id, name, branch_id').order('name');
      if (batchData) setBatches(batchData);
    };
    fetchFilters();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlayers = useCallback(async (page: number, search: string, branch: string, batch: string) => {
    setIsLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('players')
      .select('*, branches (name)', { count: 'exact' })
      .order('full_name', { ascending: true })
      .range(from, to);

    if (search.trim()) {
      query = query.or(
        `full_name.ilike.%${search}%,parent_name.ilike.%${search}%`
      );
    }

    if (branch !== 'all') {
      query = query.eq('branch_id', branch);
    }

    if (batch !== 'all') {
      query = query.eq('batch_id', batch);
    }

    const { data, error, count } = await query;

    if (error) {
      showToast('Failed to load players. Please refresh the page.');
    } else if (data) {
      setPlayers(data as Player[]);
      setTotalCount(count ?? 0);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPlayers(currentPage, searchQuery, filterBranch, filterBatch);
  }, [fetchPlayers, currentPage, searchQuery, filterBranch, filterBatch]);

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  // Called after AddPlayerModal succeeds. If player data is returned (new player), open the fees modal.
  const handlePlayerSuccess = (playerData?: { id: string; full_name: string; branch_id: string; enrolled_date: string }) => {
    fetchPlayers(currentPage, searchQuery, filterBranch, filterBatch);
    if (playerData?.id) {
      setNewPlayerData(playerData);
      setShowAddFeesModal(true);
    }
  };

  const handleDeleteClick = (player: Player) => {
    setPlayerToDelete(player);
    setShowDeleteModal(true);
  };

  const handlePlayerDeleted = () => {
    setShowDeleteModal(false);
    setPlayerToDelete(null);
    fetchPlayers(currentPage, searchQuery, filterBranch, filterBatch);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (q: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(q);
      setCurrentPage(1);
    }, 300);
  };

  const handleBranchChange = (branchId: string) => {
    setFilterBranch(branchId);
    setFilterBatch('all');
    setCurrentPage(1);
  };

  const handleBatchChange = (batchId: string) => {
    setFilterBatch(batchId);
    setCurrentPage(1);
  };

  const branchBatches = filterBranch === 'all'
    ? []
    : batches.filter((b) => b.branch_id === filterBranch);
  const showBatchFilter = branchBatches.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Registry</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount > 0 ? `${totalCount} players registered across all branches.` : 'Manage all your enrolled students here.'}
          </p>
        </div>
        {(totalCount > 0 || isLoading) && (
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto shrink-0">
            <UserPlus2 className="w-4 h-4 mr-2" />
            Register Player
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      {(totalCount > 0 || searchQuery) && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by player name or parent..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 pl-4 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <div className="flex gap-2">
            <select
              value={filterBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {showBatchFilter && (
              <select
                value={filterBatch}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer"
              >
                <option value="all">All Batches</option>
                {branchBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {totalCount === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title={searchQuery ? "No players found" : "No players registered"}
              description={searchQuery ? "Try a different search term." : "Start building your player registry by registering your first student."}
              action={
                !searchQuery ? (
                  <Button onClick={() => setIsModalOpen(true)}>
                    <UserPlus2 className="w-4 h-4 mr-2" />
                    Register Player
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <PlayerTable
              players={players}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalCount}
              itemsPerPage={ITEMS_PER_PAGE}
              itemLabel="players"
            />
          </>
        )}
      </div>

      {/* Add / Edit player modal */}
      <AddPlayerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handlePlayerSuccess}
        editingPlayer={editingPlayer}
      />

      {/* Fees modal – auto opens after a new player is created */}
      <AddFeesForNewPlayerModal
        isOpen={showAddFeesModal}
        onClose={() => {
          setShowAddFeesModal(false);
          setNewPlayerData(null);
        }}
        onSuccess={() => {
          setShowAddFeesModal(false);
          setNewPlayerData(null);
        }}
        playerData={newPlayerData}
      />

      {/* Delete (drop) player modal */}
      <DeletePlayerModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPlayerToDelete(null);
        }}
        onSuccess={handlePlayerDeleted}
        player={playerToDelete}
        deleteAction="admin"
      />
    </div>
  );
}
