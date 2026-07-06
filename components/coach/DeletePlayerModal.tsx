'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { deleteCoachPlayer } from '@/app/(coach)/my-players/actions'
import { deleteAdminPlayer } from '@/app/(admin)/players/actions'
import { createClient } from '@/lib/supabase/client'

interface Player {
  id: string
  full_name: string
  parent_name: string
  parent_phone: string
  date_of_birth: string
  enrolled_date?: string
  status: string
}

interface DeletePlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  player?: Player | null
  // 'admin' uses deleteAdminPlayer action; 'coach' (default) uses deleteCoachPlayer action
  deleteAction?: 'admin' | 'coach'
}

interface PendingFeesSummary {
  count: number
  totalAmount: number
}

export function DeletePlayerModal({ isOpen, onClose, onSuccess, player, deleteAction = 'coach' }: DeletePlayerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingFees, setPendingFees] = useState<PendingFeesSummary | null>(null)
  const [isFetchingFees, setIsFetchingFees] = useState(false)

  const supabase = createClient()

  // Fetch pending fees when modal opens
  useEffect(() => {
    if (isOpen && player) {
      const fetchPendingFees = async () => {
        setIsFetchingFees(true)
        try {
          const { data } = await (supabase as any)
            .from('fees')
            .select('id, amount')
            .eq('player_id', player.id)
            .in('status', ['pending', 'overdue'])

          if (data && data.length > 0) {
            const totalAmount = data.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0)
            setPendingFees({ count: data.length, totalAmount })
          } else {
            setPendingFees({ count: 0, totalAmount: 0 })
          }
        } catch {
          setPendingFees(null)
        } finally {
          setIsFetchingFees(false)
        }
      }

      fetchPendingFees()
      setError('')
    }
  }, [isOpen, player])

  const handleDelete = async () => {
    if (!player) return

    setError('')
    setIsLoading(true)

    const result = deleteAction === 'admin'
      ? await deleteAdminPlayer(player.id)
      : await deleteCoachPlayer(player.id)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      onSuccess()
      onClose()
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (!player) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Drop Player">
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-200">
            <p className="font-medium mb-1">Player will be marked as DROPPED</p>
            <p className="text-xs opacity-90">
              The player record and all fee history will be kept for reference. This action can be undone by an admin.
            </p>
          </div>
        </div>

        {/* Player details */}
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Player Name</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{player.full_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(player.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Status</p>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  player.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {player.status === 'active' ? 'Active' : player.status === 'inactive' ? 'Inactive' : 'Dropped'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Parent Name</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{player.parent_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Parent Phone</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{player.parent_phone}</p>
            </div>
          </div>
        </div>

        {/* Pending fees warning */}
        {isFetchingFees ? (
          <div className="flex items-center gap-2 p-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            Checking pending fees...
          </div>
        ) : pendingFees && pendingFees.count > 0 ? (
          <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium mb-0.5">
                ⚠️ {pendingFees.count} unpaid fee{pendingFees.count > 1 ? 's' : ''} — ₹{pendingFees.totalAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs opacity-80">
                These fee records will remain in the system and will still be visible in your fees tab.
              </p>
            </div>
          </div>
        ) : pendingFees?.count === 0 ? (
          <div className="flex gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            <span className="text-base">✓</span> No pending fees for this player.
          </div>
        ) : null}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} isLoading={isLoading}>
            Drop Player
          </Button>
        </div>
      </div>
    </Modal>
  )
}
