"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PlayerTable } from '@/components/admin/PlayerTable';
import { AddPlayerModal } from '@/components/admin/AddPlayerModal';
import { AddFeesForNewPlayerModal } from '@/components/coach/AddFeesForNewPlayerModal';
import { DeletePlayerModal } from '@/components/coach/DeletePlayerModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { UserPlus2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Player = Database['public']['Tables']['players']['Row'] & {
  branches?: { name: string } | null;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

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

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        branches (name)
      `)
      .order('full_name', { ascending: true });

    if (data && !error) {
      setPlayers(data as Player[]);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  // Called after AddPlayerModal succeeds. If a new player was created, open the fees modal.
  const handlePlayerSuccess = (newPlayer?: any) => {
    fetchPlayers();
    if (newPlayer) {
      // New player was created - open fees popup
      setNewPlayerData({
        id: newPlayer.id,
        full_name: newPlayer.full_name,
        branch_id: newPlayer.branch_id,
        enrolled_date: newPlayer.enrolled_date,
      });
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
    fetchPlayers();
  };

  const filteredPlayers = players.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.branches?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1); // reset to page 1 on new search
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player Registry</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {players.length > 0 ? `${players.length} players registered across all branches.` : 'Manage all your enrolled students here.'}
          </p>
        </div>
        {(players.length > 0 || isLoading) && (
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto shrink-0">
            <UserPlus2 className="w-4 h-4 mr-2" />
            Register Player
          </Button>
        )}
      </div>

      {/* Search bar */}
      {players.length > 0 && (
        <div className="relative">
        <input
            type="text"
            placeholder="Search by player name, parent or branch..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {players.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No players registered"
              description="Start building your player registry by registering your first student."
              action={
                <Button onClick={() => setIsModalOpen(true)}>
                  <UserPlus2 className="w-4 h-4 mr-2" />
                  Register Player
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <PlayerTable
              players={paginatedPlayers}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPlayers.length}
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
