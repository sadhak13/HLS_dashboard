"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Users, Phone, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AddPlayerModal } from '@/components/coach/AddPlayerModal'
import { AddFeesForNewPlayerModal } from '@/components/coach/AddFeesForNewPlayerModal'
import { DeletePlayerModal } from '@/components/coach/DeletePlayerModal'
import { Pagination } from '@/components/ui/Pagination'

interface PlayerRecord {
  id: string
  full_name: string
  status: 'active' | 'inactive' | 'dropped'
  parent_name: string
  parent_phone: string
  date_of_birth: string
  enrolled_date: string
}

export default function MyPlayersPage() {
  const { profile } = useAuth()
  const supabase = createClient()

  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [branchId, setBranchId] = useState('')

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
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  const fetchPlayers = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)

    // Try using the RPC function first
    const { data: rpcBranchId, error: rpcError } = await supabase.rpc('get_coach_branch_id')

    let resolvedBranchId: any = rpcBranchId
    
    if (rpcError || !resolvedBranchId) {
      console.warn('RPC failed or returned null, falling back to direct table query...', rpcError)
      const { data: coachData } = await (supabase as any)
        .from('coaches')
        .select('branch_id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (!coachData) {
        setIsLoading(false)
        return
      }
      resolvedBranchId = coachData.branch_id
    }

    setBranchId(resolvedBranchId as string)

    const { data } = await (supabase as any)
      .from('players')
      .select('id, full_name, status, parent_name, parent_phone, date_of_birth, enrolled_date')
      .eq('branch_id', resolvedBranchId)
      .order('full_name')

    setPlayers((data as PlayerRecord[]) ?? [])
    setIsLoading(false)
  }, [profile, supabase])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handlePlayerCreated = (playerData: {
    id: string
    full_name: string
    branch_id: string
    enrolled_date: string
  }) => {
    setNewPlayerData(playerData)
    setShowAddPlayerModal(false)
    setShowAddFeesModal(true)
  }

  const handleFeesAdded = () => {
    setShowAddFeesModal(false)
    fetchPlayers()
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

  const totalPages = Math.ceil(players.length / ITEMS_PER_PAGE)
  const paginatedPlayers = players.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-green-600">Your branch players</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Player list</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keep track of the players assigned to your branch.
          </p>
        </div>
        <Button onClick={() => setShowAddPlayerModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Player
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">Active</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{activePlayersCount}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Inactive</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{inactivePlayersCount}</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">Dropped</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{droppedPlayersCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center p-10 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-3">No players yet. Add your first player to get started.</p>
          <Button onClick={() => setShowAddPlayerModal(true)}>Add Player</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedPlayers.map((player) => (
            <div
              key={player.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">{player.full_name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Parent: {player.parent_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      player.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : player.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {player.status === 'active' ? 'Active' : player.status === 'inactive' ? 'Inactive' : 'Dropped'}
                  </span>
                  <button
                    onClick={() => handleDeleteClick(player)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete player"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="h-4 w-4" />
                <span>{player.parent_phone}</span>
              </div>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={players.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="players"
          />
        </div>
      )}

      {/* Modals */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        onPlayerCreated={handlePlayerCreated}
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
