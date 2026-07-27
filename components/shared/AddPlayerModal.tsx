'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { createAdminPlayer, updateAdminPlayer } from '@/app/(admin)/players/actions'
import { createCoachPlayer, updateCoachPlayer } from '@/app/(coach)/my-players/actions'
import { useAuth } from '@/context/AuthContext'
import { getCoachBranches, type CoachBranch } from '@/lib/coach'

interface EditingPlayer {
  id: string
  full_name: string
  date_of_birth: string
  parent_name: string
  parent_phone: string
  enrolled_date?: string | null
  branch_id?: string | null
  batch_id?: string | null
  aadhar_number?: string | null
  gender?: string | null
  status?: string | null
}

interface BatchOption {
  id: string
  branch_id: string
  name: string
  start_time: string
  end_time: string
}

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (playerData?: { id: string; full_name: string; branch_id: string; enrolled_date: string }) => void
  editingPlayer?: EditingPlayer | null
}

export function AddPlayerModal({ isOpen, onClose, onSuccess, editingPlayer }: AddPlayerModalProps) {
  const { profile } = useAuth()
  const supabase = createClient()
  const isAdmin = profile?.role === 'ADMIN'
  const isEditing = !!editingPlayer

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])

  // Form state
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'dropped'>('active')
  const [enrolledDate, setEnrolledDate] = useState('')
  const [aadharNumber, setAadharNumber] = useState('')

  // Fetch branches/batches when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      const fetchData = async () => {
        try {
          if (isAdmin) {
            const { data: branchData } = await supabase.from('branches').select('id, name').order('name')
            if (branchData) setBranches(branchData)
          } else {
            const coachBranches = await getCoachBranches(profile.id)
            if (coachBranches.length > 1) {
              setBranches(coachBranches)
            } else if (coachBranches.length === 1) {
              setBranchId(coachBranches[0].id)
            } else {
              setError('You are not assigned to any branch. Please contact an admin.')
            }
          }

          const { data: batchData } = await (supabase as any)
            .from('batches')
            .select('id, branch_id, name, start_time, end_time')
            .order('start_time')
          if (batchData) setBatches(batchData)
        } catch (err) {
          console.error('Error fetching data:', err)
          setError('Failed to load form data')
        }
      }

      fetchData()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize form fields only when modal opens or editingPlayer changes — NOT on profile refresh
  useEffect(() => {
    if (!isOpen) return

    if (editingPlayer) {
      setFullName(editingPlayer.full_name)
      setDob(editingPlayer.date_of_birth || '')
      setGender((editingPlayer.gender as 'male' | 'female') || 'male')
      setParentName(editingPlayer.parent_name || '')
      setParentPhone(editingPlayer.parent_phone || '')
      setBranchId(editingPlayer.branch_id || '')
      setBatchId(editingPlayer.batch_id || '')
      setStatus((editingPlayer.status as any) || 'active')
      setEnrolledDate(editingPlayer.enrolled_date || '')
      setAadharNumber(editingPlayer.aadhar_number || '')
    } else {
      setFullName('')
      setDob('')
      setGender('male')
      setParentName('')
      setParentPhone('')
      if (isAdmin) setBranchId('')
      setBatchId('')
      setStatus('active')
      setEnrolledDate(new Date().toISOString().split('T')[0])
      setAadharNumber('')
    }
    setError('')
  }, [isOpen, editingPlayer]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBatches = batches.filter(b => b.branch_id === branchId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
    formData.append('gender', gender)
    formData.append('parentName', parentName)
    formData.append('parentPhone', parentPhone)
    formData.append('branchId', branchId)
    formData.append('batchId', batchId)
    formData.append('status', status)
    formData.append('enrolledDate', enrolledDate)
    formData.append('aadharNumber', aadharNumber)

    try {
      if (isEditing) {
        const result = isAdmin
          ? await updateAdminPlayer(editingPlayer!.id, formData)
          : await updateCoachPlayer(editingPlayer!.id, formData)

        if (result.error) {
          setError(result.error)
        } else {
          onSuccess()
          onClose()
        }
      } else {
        const result = isAdmin
          ? await createAdminPlayer(formData)
          : await createCoachPlayer(formData)

        if (result.error) {
          setError(result.error)
        } else {
          const playerData = isAdmin
            ? { id: (result as any).player?.id, full_name: (result as any).player?.full_name, branch_id: (result as any).player?.branch_id, enrolled_date: (result as any).player?.enrolled_date }
            : { id: (result as any).playerId, full_name: (result as any).playerName, branch_id: branchId, enrolled_date: enrolledDate }
          onSuccess(playerData)
          onClose()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save player')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Player' : 'Register New Player'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Input
              label="Full Name *"
              placeholder="e.g. Mohammed Ali"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Include both first and last name</p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gender
            </label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="player-gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Male</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="player-gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Female</span>
              </label>
            </div>
          </div>

          {/* Branch (admin always, coach when multiple branches) */}
          {(isAdmin || (!isAdmin && branches.length > 1)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Branch *
              </label>
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setBatchId(''); }}
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

          {/* Batch */}
          {branchId && filteredBatches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="">Select a batch...</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Parent Name */}
          <div>
            <Input
              label="Parent / Guardian Name"
              placeholder="e.g. Ahmed Ali"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />
          </div>

          {/* Parent Phone */}
          <div>
            <Input
              type="tel"
              label="Parent Phone *"
              placeholder="e.g. 9876543210"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
            />
          </div>

          {/* Aadhar */}
          <div>
            <Input
              type="text"
              label="Aadhar Number (Optional)"
              placeholder="e.g. 123456789012"
              value={aadharNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 12)
                setAadharNumber(val)
              }}
              maxLength={12}
            />
            {aadharNumber && aadharNumber.length !== 12 && (
              <p className="text-xs text-amber-500 mt-1">Aadhar must be 12 digits</p>
            )}
          </div>

          {/* Enrolled Date */}
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

          {/* Status (admin only, visible when editing) */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'dropped')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                {isEditing && <option value="dropped">Dropped</option>}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Register Player'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
