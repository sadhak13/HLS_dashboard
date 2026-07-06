'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createInitialPlayerFee } from '@/app/(coach)/my-players/actions'

interface AddFeesForNewPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  playerData?: {
    id: string
    full_name: string
    branch_id: string
    enrolled_date: string
  } | null
}

export function AddFeesForNewPlayerModal({
  isOpen,
  onClose,
  onSuccess,
  playerData,
}: AddFeesForNewPlayerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state with auto-populated defaults
  const [amount, setAmount] = useState('2000')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [modeOfPayment, setModeOfPayment] = useState<'cash' | 'online' | 'cash+online'>('cash')

  // Calculate due date (next month same date)
  useEffect(() => {
    if (playerData?.enrolled_date) {
      const enrolled = new Date(playerData.enrolled_date)
      const nextMonth = new Date(enrolled.getFullYear(), enrolled.getMonth() + 1, enrolled.getDate())
      setStartDate(playerData.enrolled_date)
      setDueDate(nextMonth.toISOString().split('T')[0])
    }
  }, [playerData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (!playerData) {
      setError('Player data not found')
      return
    }

    setIsLoading(true)

    const result = await createInitialPlayerFee(
      playerData.id,
      playerData.branch_id,
      startDate,
      parseFloat(amount),
      modeOfPayment
    )

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Fees for ${playerData?.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-700 dark:text-blue-400">
          <p className="font-medium mb-1">Fee Details for New Player</p>
          <p className="text-xs opacity-90">Amount: ₹{amount} | From: {startDate} | Due: {dueDate}</p>
        </div>

        <div>
          <Input
            type="number"
            label="Amount (₹) *"
            placeholder="e.g. 2000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fee Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            disabled
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-calculated (next month same date)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mode of Payment *
          </label>
          <select
            value={modeOfPayment}
            onChange={(e) => setModeOfPayment(e.target.value as any)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cash+online">Cash + Online</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Skip for Now
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add Fees
          </Button>
        </div>
      </form>
    </Modal>
  )
}
