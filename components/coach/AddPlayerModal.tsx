'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { createCoachPlayer } from '@/app/(coach)/my-players/actions'
import { useAuth } from '@/context/AuthContext'
import type { Database } from '@/types/database.types'

type Player = Database['public']['Tables']['players']['Row']

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayerCreated: (player: { id: string; full_name: string; branch_id: string; enrolled_date: string }) => void
  branchId?: string // Optional: can be passed directly from parent
}

export function AddPlayerModal({ isOpen, onClose, onPlayerCreated, branchId: propBranchId }: AddPlayerModalProps) {
  const { profile } = useAuth()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [branchId, setBranchId] = useState<string | null>(propBranchId || null)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

  // Form state
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [enrolledDate, setEnrolledDate] = useState('')

  // Get branch info on open
  useEffect(() => {
    if (isOpen && profile) {
      const fetchBranchInfo = async () => {
        try {
          if (profile.role === 'ADMIN') {
            const { data } = await supabase.from('branches').select('id, name').order('name')
            if (data) setBranches(data)
            if (!propBranchId) setBranchId(null) // Reset branchId if admin to force selection
          } else if (!propBranchId) {
            // Try to use the RPC function first, as RLS policies on the coaches table might prevent direct SELECTs
            const { data: branchId, error } = await supabase.rpc('get_coach_branch_id')

            if (error) {
              console.warn('RPC failed, falling back to direct table query...', error)
              const { data: coachData, error: coachError } = await (supabase as any)
                .from('coaches')
                .select('branch_id')
                .eq('user_id', profile.id)
                .maybeSingle()

              if (coachError) throw coachError
              if (coachData && coachData.branch_id) {
                setBranchId(coachData.branch_id)
              } else {
                setError('You are not assigned to any branch. Please contact an admin.')
              }
            } else if (branchId) {
              setBranchId(branchId)
            } else {
              setError('You are not assigned to any branch. Please contact an admin.')
            }
          }
        } catch (err) {
          console.error('Error fetching branch:', err)
          setError('Failed to load branch information')
        }
      }

      fetchBranchInfo()
      // Reset form
      setFullName('')
      setDob('')
      setParentName('')
      setParentPhone('')
      setEnrolledDate(new Date().toISOString().split('T')[0])
      setError('')
    }
  }, [isOpen, profile, propBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }

    if (fullName.trim().split(' ').length < 2) {
      setError('Please enter full name (first and last name)')
      return
    }

    if (!parentPhone.trim()) {
      setError('Parent phone is required')
      return
    }

    if (!branchId) {
      setError('Branch information not available')
      return
    }

    setIsLoading(true)

    const formData = new FormData()
    formData.append('fullName', fullName)
    formData.append('dob', dob)
    formData.append('parentName', parentName)
    formData.append('parentPhone', parentPhone)
    formData.append('branchId', branchId)
    formData.append('enrolledDate', enrolledDate)

    const result = await createCoachPlayer(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      // Success - pass back to parent to open fees modal
      onPlayerCreated({
        id: result.playerId,
        full_name: result.playerName,
        branch_id: branchId,
        enrolled_date: enrolledDate,
      })
      setFullName('')
      setDob('')
      setParentName('')
      setParentPhone('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Player">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Include both first and last name
          </p>
        </div>

        {profile?.role === 'ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Branch *
            </label>
            <select
              value={branchId || ''}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Select a branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <Input
            label="Parent/Guardian Name"
            placeholder="e.g. Amit Sharma"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Parent Phone *"
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
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add Player
          </Button>
        </div>
      </form>
    </Modal>
  )
}
