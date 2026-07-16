'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { deleteCoachPlayer } from '@/app/(coach)/my-players/actions'
import { deleteAdminPlayer, permanentDeleteAdminPlayer } from '@/app/(admin)/players/actions'
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
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false)

  const supabase = createClient()

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
      setConfirmPermanentDelete(false)
    }
  }, [isOpen, player])

  const handleDrop = async () => {
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
      setIsLoading(false)
      onSuccess()
      onClose()
    }
  }

  const handlePermanentDelete = async () => {
    if (!player) return

    setError('')
    setIsLoading(true)

    const result = await permanentDeleteAdminPlayer(player.id)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsLoading(false)
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
    <Modal isOpen={isOpen} onClose={onClose} title={deleteAction === 'admin' ? 'Remove Player' : 'Drop Player'}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

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
                    : player.status === 'dropped'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
                {pendingFees.count} unpaid fee{pendingFees.count > 1 ? 's' : ''} — ₹{pendingFees.totalAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs opacity-80">
                {deleteAction === 'admin' && confirmPermanentDelete
                  ? 'These records will be permanently deleted along with the player.'
                  : 'These fee records will remain in the system after dropping.'
                }
              </p>
            </div>
          </div>
        ) : pendingFees?.count === 0 ? (
          <div className="flex gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            <span className="text-base">✓</span> No pending fees for this player.
          </div>
        ) : null}

        {/* Drop option info */}
        {!confirmPermanentDelete && (
          <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-200">
              <p className="font-medium mb-1">Player will be marked as DROPPED</p>
              <p className="text-xs opacity-90">
                The player record and all fee/attendance history will be kept for reference. This action can be undone by an admin.
              </p>
            </div>
          </div>
        )}

        {/* Permanent delete confirmation (admin only) */}
        {deleteAction === 'admin' && confirmPermanentDelete && (
          <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-200">
              <p className="font-medium mb-1">PERMANENT DELETION</p>
              <p className="text-xs opacity-90">
                This will permanently remove the player and ALL their attendance and fee records from the database. This action CANNOT be undone.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-6">
          {/* Main action row */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            {confirmPermanentDelete ? (
              <Button type="button" variant="danger" onClick={handlePermanentDelete} isLoading={isLoading}>
                Yes, Permanently Delete
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={handleDrop} isLoading={isLoading}>
                Drop Player
              </Button>
            )}
          </div>

          {/* Permanent delete toggle (admin only) */}
          {deleteAction === 'admin' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {!confirmPermanentDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmPermanentDelete(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanently Delete Instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmPermanentDelete(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                >
                  Go back to Drop instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
