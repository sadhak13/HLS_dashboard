"use client";

import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { UserCircle, KeyRound, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { resetManagerPassword, deactivateManager, reactivateManager, deleteManager } from '@/app/(admin)/managers/actions';

interface ManagerTableProps {
  managers: any[];
  isLoading: boolean;
  onEdit: (manager: any) => void;
}

function ActionButtons({ isInactive, onEdit, onReset, onDeactivate, onReactivate, onDelete }: {
  isInactive: boolean;
  onEdit: () => void;
  onReset: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {!isInactive && (
        <>
          <button type="button" onClick={onEdit} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors" title="Edit Manager">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={onReset} className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors" title="Reset Password">
            <KeyRound className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDeactivate} className="p-2 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors" title="Deactivate Manager">
            <UserX className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Delete Manager">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
      {isInactive && (
        <>
          <button type="button" onClick={onReactivate} className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors" title="Reactivate Manager">
            <UserCheck className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Delete Manager">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function ManagerTable({ managers, isLoading, onEdit }: ManagerTableProps) {
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingName, setResettingName] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deactivatingManager, setDeactivatingManager] = useState<{ id: string; name: string } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deletingManager, setDeletingManager] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleResetPassword() {
    if (!resettingUserId) return;
    setIsResetting(true);
    const result = await resetManagerPassword(resettingUserId);
    setIsResetting(false);
    if (result.success) {
      setResetResult({ password: result.password!, name: resettingName });
    }
    setResettingUserId(null);
    setResettingName('');
  }

  async function handleDeactivate() {
    if (!deactivatingManager) return;
    setIsDeactivating(true);
    const result = await deactivateManager(deactivatingManager.id);
    setIsDeactivating(false);
    if (result.success) {
      setDeactivatingManager(null);
      window.location.reload();
    }
  }

  async function handleReactivate(managerId: string) {
    const result = await reactivateManager(managerId);
    if (result.success) {
      window.location.reload();
    }
  }

  async function handleDelete() {
    if (!deletingManager) return;
    setIsDeleting(true);
    const result = await deleteManager(deletingManager.id);
    setIsDeleting(false);
    if (result.success) {
      setDeletingManager(null);
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
          <span className="text-sm">Loading managers...</span>
        </div>
      </div>
    );
  }

  const getActionProps = (manager: any) => ({
    isInactive: manager.status === 'inactive',
    onEdit: () => onEdit(manager),
    onReset: () => {
      setResettingUserId(manager.user_id);
      setResettingName(manager.profiles?.full_name || 'this manager');
    },
    onDeactivate: () => setDeactivatingManager({ id: manager.id, name: manager.profiles?.full_name || 'this manager' }),
    onReactivate: () => handleReactivate(manager.id),
    onDelete: () => setDeletingManager({ id: manager.id, name: manager.profiles?.full_name || 'this manager' }),
  });

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No managers found. Provision an account to get started!
                </TableCell>
              </TableRow>
            ) : (
              managers.map((manager) => {
                const isInactive = manager.status === 'inactive';
                return (
                  <TableRow key={manager.id} className={isInactive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-full ${isInactive ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500'}`}>
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {manager.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {manager.branches?.name || 'Unassigned'}
                      {manager.branches?.location ? <span className="text-gray-500"> · {manager.branches.location}</span> : null}
                    </TableCell>
                    <TableCell className="text-sm">{manager.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(manager.created_at)}</TableCell>
                    <TableCell>
                      {isInactive ? <Badge variant="default">Inactive</Badge> : <Badge variant="success">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ActionButtons {...getActionProps(manager)} />
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
        {managers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No managers found. Provision an account to get started!
          </div>
        ) : (
          managers.map((manager) => {
            const isInactive = manager.status === 'inactive';
            return (
              <div key={manager.id} className={`p-4 space-y-3 ${isInactive ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full ${isInactive ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500'}`}>
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {manager.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{manager.phone || 'No phone'}</p>
                    </div>
                  </div>
                  {isInactive ? <Badge variant="default">Inactive</Badge> : <Badge variant="success">Active</Badge>}
                </div>

                <p className="text-xs text-gray-500">{manager.branches?.name || 'Unassigned'}</p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-500">Added {formatDate(manager.created_at)}</span>
                  <ActionButtons {...getActionProps(manager)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Deactivate Confirmation Modal */}
      {deactivatingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <UserX className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deactivate Manager</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to deactivate <strong>{deactivatingManager.name}</strong>? They will no longer be able to log in.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeactivatingManager(null)}
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

      {/* Delete Manager Confirmation Modal */}
      {deletingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Manager Permanently</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete <strong>{deletingManager.name}</strong>? This will remove:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Their manager profile record</li>
              <li>Their user account</li>
            </ul>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeletingManager(null)}
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
