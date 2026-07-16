"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Users, Phone, Plus, Trash2, Search, UserCircle, Pencil } from 'lucide-react'
import { AddPlayerModal } from '@/components/shared/AddPlayerModal'
import { AddFeesForNewPlayerModal } from '@/components/coach/AddFeesForNewPlayerModal'
import { DeletePlayerModal } from '@/components/coach/DeletePlayerModal'
import { Pagination } from '@/components/ui/Pagination'
import { getCoachBranches, type CoachBranch } from '@/lib/coach'

interface PlayerRecord {
  id: string
  full_name: string
  status: 'active' | 'inactive' | 'dropped'
  parent_name: string
  parent_phone: string
  date_of_birth: string
  enrolled_date: string
  branch_id?: string
  batch_id?: string
  aadhar_number?: string
}

export default function MyPlayersPage() {
  const { profile } = useAuth()
  const supabase = createClient()

  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [branchId, setBranchId] = useState('')
  const [coachBranches, setCoachBranches] = useState<CoachBranch[]>([])
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
  const [showAddFeesModal, setShowAddFeesModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Data for modals
  const [newPlayerData, setNewPlayerData] = useState<{
    id: string
    full_name: string
    branch_id: string
    enrolled_date: string
  } | null>(null)
  const [playerToDelete, setPlayerToDelete] = useState<PlayerRecord | null>(null)
  const [playerToEdit, setPlayerToEdit] = useState<PlayerRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  const fetchPlayers = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    const branches = await getCoachBranches(profile.id)
    setCoachBranches(branches)

    if (branches.length === 0) {
      setIsLoading(false)
      return
    }

    setBranchId(branches[0].id)
    const branchIds = branches.map(b => b.id)

    const { data } = await (supabase as any)
      .from('players')
      .select('id, full_name, status, parent_name, parent_phone, date_of_birth, enrolled_date, batch_id, aadhar_number, branch_id')
      .in('branch_id', branchIds)
      .order('full_name')

    setPlayers((data as PlayerRecord[]) ?? [])
    setIsLoading(false)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handlePlayerSuccess = (playerData?: { id: string; full_name: string; branch_id: string; enrolled_date: string }) => {
    setShowAddPlayerModal(false)
    setPlayerToEdit(null)
    if (playerData?.id) {
      setNewPlayerData(playerData)
      setShowAddFeesModal(true)
    }
    fetchPlayers()
  }

  const handleFeesAdded = () => {
    setShowAddFeesModal(false)
    fetchPlayers()
  }

  const handleEditClick = (player: PlayerRecord) => {
    setPlayerToEdit(player)
    setShowAddPlayerModal(true)
  }

  const handleDeleteClick = (player: PlayerRecord) => {
    setPlayerToDelete(player)
    setShowDeleteModal(true)
  }

  const handlePlayerDeleted = () => {
    setShowDeleteModal(false)
    setPlayerToDelete(null)
    fetchPlayers()
  }

  const activePlayersCount = players.filter((p) => p.status === 'active').length
  const inactivePlayersCount = players.filter((p) => p.status === 'inactive').length
  const droppedPlayersCount = players.filter((p) => p.status === 'dropped').length

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parent_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesBranch = selectedBranchFilter === 'all' || p.branch_id === selectedBranchFilter
    return matchesSearch && matchesBranch
  })

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE)
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Player Directory</h1>
          <p className="text-sm text-gray-400 mt-1">
            {players.length} {players.length === 1 ? 'player' : 'players'} in your branch
          </p>
        </div>
        <button
          onClick={() => setShowAddPlayerModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/25 border border-green-500/30 transition-all duration-200 active:scale-95 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Player
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Active</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{activePlayersCount}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Inactive</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{inactivePlayersCount}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col items-center text-center sm:flex-row sm:text-left gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Dropped</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{droppedPlayersCount}</p>
          </div>
        </div>
      </div>

      {/* Search + Branch Filter */}
      {players.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or parent..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
          {coachBranches.length > 1 && (
            <select
              value={selectedBranchFilter}
              onChange={(e) => { setSelectedBranchFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Branches</option>
              {coachBranches.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && players.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">No players yet</p>
            <p className="text-sm text-gray-400">Add your first player to get started.</p>
          </div>
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/25 border border-green-500/30 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        </div>
      )}

      {/* Player List */}
      {!isLoading && players.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          {/* Table Header (desktop) */}
          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parent</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider sr-only">Actions</span>
          </div>

          <div className="divide-y divide-white/5">
            {paginatedPlayers.map((player) => (
              <div
                key={player.id}
                className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_auto] gap-2 sm:gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
              >
                {/* Player Name */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 shrink-0">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{player.full_name}</p>
                    <p className="text-[11px] text-gray-500 sm:hidden flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {player.parent_phone}
                    </p>
                  </div>
                </div>

                {/* Parent Info */}
                <div className="hidden sm:flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-300 truncate">{player.parent_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {player.parent_phone}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      player.status === 'active'
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : player.status === 'inactive'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                  >
                    {player.status === 'active' ? 'Active' : player.status === 'inactive' ? 'Inactive' : 'Dropped'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleEditClick(player)}
                    className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="Edit player"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(player)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Drop player"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredPlayers.length > ITEMS_PER_PAGE && (
            <div className="border-t border-white/10 px-4 py-3">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredPlayers.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemLabel="players"
              />
            </div>
          )}
        </div>
      )}

      {/* No results from search */}
      {!isLoading && players.length > 0 && filteredPlayers.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-12 text-center">
          <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No players match &ldquo;{searchQuery}&rdquo;</p>
        </div>
      )}

      {/* Modals */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => { setShowAddPlayerModal(false); setPlayerToEdit(null); }}
        onSuccess={handlePlayerSuccess}
        editingPlayer={playerToEdit}
      />

      <AddFeesForNewPlayerModal
        isOpen={showAddFeesModal}
        onClose={() => setShowAddFeesModal(false)}
        onSuccess={handleFeesAdded}
        playerData={newPlayerData}
      />

      <DeletePlayerModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handlePlayerDeleted}
        player={playerToDelete}
      />
    </div>
  )
}
