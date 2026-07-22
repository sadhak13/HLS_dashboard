"use client";

import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { UserCircle, KeyRound, Pencil, UserX, UserCheck, ArrowRightLeft, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { resetCoachPassword, deactivateCoach, reactivateCoach, deleteCoach } from '@/app/(admin)/coaches/actions';

interface CoachTableProps {
  coaches: any[];
  isLoading: boolean;
  onEdit: (coach: any) => void;
  onTransfer: (coach: any) => void;
}

function ActionButtons({ coach, isInactive, onEdit, onTransfer, onReset, onDeactivate, onReactivate, onDelete }: {
  coach: any;
  isInactive: boolean;
  onEdit: () => void;
  onTransfer: () => void;
  onReset: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {!isInactive && (
        <>
          <button type="button" onClick={onEdit} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit Coach">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={onReset} className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors" title="Reset Password">
            <KeyRound className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDeactivate} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Deactivate Coach">
            <UserX className="w-4 h-4" />
          </button>
        </>
      )}
      {isInactive && (
        <>
          <button type="button" onClick={onReactivate} className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Reactivate Coach">
            <UserCheck className="w-4 h-4" />
          </button>
          {coach.coach_batches?.length > 0 && (
            <button type="button" onClick={onTransfer} className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors" title="Transfer Batches">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Delete Permanently">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function CoachTable({ coaches, isLoading, onEdit, onTransfer }: CoachTableProps) {
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingName, setResettingName] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deactivatingCoach, setDeactivatingCoach] = useState<{ id: string; name: string } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deletingCoach, setDeletingCoach] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleResetPassword() {
    if (!resettingUserId) return;
    setIsResetting(true);
    const result = await resetCoachPassword(resettingUserId);
    setIsResetting(false);
    if (result.success) {
      setResetResult({ password: result.password!, name: resettingName });
    }
    setResettingUserId(null);
    setResettingName('');
  }

  async function handleDeactivate() {
    if (!deactivatingCoach) return;
    setIsDeactivating(true);
    const result = await deactivateCoach(deactivatingCoach.id);
    setIsDeactivating(false);
    if (result.success) {
      setDeactivatingCoach(null);
      window.location.reload();
    }
  }

  async function handleReactivate(coachId: string) {
    const result = await reactivateCoach(coachId);
    if (result.success) {
      window.location.reload();
    }
  }

  async function handleDelete() {
    if (!deletingCoach) return;
    setIsDeleting(true);
    const result = await deleteCoach(deletingCoach.id);
    setIsDeleting(false);
    if (result.success) {
      setDeletingCoach(null);
      window.location.reload();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading coaches...</span>
        </div>
      </div>
    );
  }

  const getActionProps = (coach: any) => ({
    coach,
    isInactive: coach.status === 'inactive',
    onEdit: () => onEdit(coach),
    onTransfer: () => onTransfer(coach),
    onReset: () => {
      setResettingUserId(coach.user_id);
      setResettingName(coach.profiles?.full_name || 'this coach');
    },
    onDeactivate: () => setDeactivatingCoach({ id: coach.id, name: coach.profiles?.full_name || 'this coach' }),
    onReactivate: () => handleReactivate(coach.id),
    onDelete: () => setDeletingCoach({ id: coach.id, name: coach.profiles?.full_name || 'this coach' }),
  });

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coach</TableHead>
              <TableHead>Assigned Batches</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No coaches found. Provision an account to get started!
                </TableCell>
              </TableRow>
            ) : (
              coaches.map((coach) => {
                const isInactive = coach.status === 'inactive';
                return (
                  <TableRow key={coach.id} className={isInactive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-full ${isInactive ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500'}`}>
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {coach.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {coach.coach_batches && coach.coach_batches.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {coach.coach_batches.map((cb: any) => {
                            const batchName = cb.batches?.name || 'Unknown';
                            const branchName = cb.batches?.branches?.name;
                            return (
                              <span
                                key={cb.batch_id || cb.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                                title={`${batchName} · ${branchName || ''} · ${cb.batches?.start_time?.slice(0, 5) || ''} - ${cb.batches?.end_time?.slice(0, 5) || ''}`}
                              >
                                {batchName}{branchName ? ` · ${branchName}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{coach.branches?.name || 'Unassigned'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{coach.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(coach.created_at)}</TableCell>
                    <TableCell>
                      {isInactive ? <Badge variant="default">Inactive</Badge> : <Badge variant="success">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ActionButtons {...getActionProps(coach)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout - shown only on mobile */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {coaches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No coaches found. Provision an account to get started!
          </div>
        ) : (
          coaches.map((coach) => {
            const isInactive = coach.status === 'inactive';
            return (
              <div key={coach.id} className={`p-4 space-y-3 ${isInactive ? 'opacity-50' : ''}`}>
                {/* Header: Name + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full ${isInactive ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500'}`}>
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {coach.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{coach.phone || 'No phone'}</p>
                    </div>
                  </div>
                  {isInactive ? <Badge variant="default">Inactive</Badge> : <Badge variant="success">Active</Badge>}
                </div>

                {/* Batches */}
                {coach.coach_batches && coach.coach_batches.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coach.coach_batches.map((cb: any) => {
                      const batchName = cb.batches?.name || 'Unknown';
                      const branchName = cb.batches?.branches?.name;
                      return (
                        <span
                          key={cb.batch_id || cb.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                        >
                          {batchName}{branchName ? ` · ${branchName}` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-500">Added {formatDate(coach.created_at)}</span>
                  <ActionButtons {...getActionProps(coach)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Deactivate Confirmation Modal */}
      {deactivatingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <UserX className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deactivate Coach</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to deactivate <strong>{deactivatingCoach.name}</strong>? They will no longer be able to log in. You can transfer their batches to another coach afterwards.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeactivatingCoach(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Coach Confirmation Modal */}
      {deletingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Coach Permanently</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete <strong>{deletingCoach.name}</strong>? This will remove:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Their batch assignments</li>
              <li>Their coach profile record</li>
              <li>Their user account</li>
            </ul>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeletingCoach(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {resettingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to reset the password for <strong>{resettingName}</strong>? A new random password will be generated.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setResettingUserId(null); setResettingName(''); }}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password Reset Successful</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              New password for <strong>{resetResult.name}</strong>:
            </p>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                {resetResult.password}
              </p>
            </div>
            <p className="text-xs text-amber-500 dark:text-amber-400">
              This password will not be shown again. Copy it before closing.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(resetResult.password);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Password'}
              </button>
              <button
                type="button"
                onClick={() => { setResetResult(null); setCopied(false); }}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
