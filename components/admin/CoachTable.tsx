"use client";

import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { UserCircle, Clock, KeyRound } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { resetCoachPassword } from '@/app/(admin)/coaches/actions';

interface CoachTableProps {
  coaches: any[];
  isLoading: boolean;
}

export function CoachTable({ coaches, isLoading }: CoachTableProps) {
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingName, setResettingName] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string; name: string } | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg border-gray-200 dark:border-gray-700 h-64">
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

  return (
    <>
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
            coaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500">
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {coach.profiles?.full_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {coach.coach_batches && coach.coach_batches.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {coach.coach_batches.map((cb: any) => {
                        const batchName = cb.batches?.name || 'Unknown';
                        const branchName = cb.batches?.branches?.name;
                        const startTime = cb.batches?.start_time
                          ? cb.batches.start_time.slice(0, 5)
                          : null;
                        const endTime = cb.batches?.end_time
                          ? cb.batches.end_time.slice(0, 5)
                          : null;
                        const timeLabel = startTime && endTime
                          ? `${startTime} - ${endTime}`
                          : startTime || '';

                        return (
                          <span
                            key={cb.batch_id || cb.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30"
                          >
                            <Clock className="w-3 h-3" />
                            {batchName}
                            {branchName && (
                              <span className="text-green-600/70 dark:text-green-500/70">
                                · {branchName}
                              </span>
                            )}
                            {timeLabel && (
                              <span className="text-green-600/70 dark:text-green-500/70">
                                · {timeLabel}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{coach.branches?.name || 'Unassigned'}</div>
                      <div className="text-xs text-gray-500">{coach.branches?.location}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell>{coach.phone || 'N/A'}</TableCell>
                <TableCell>{formatDate(coach.created_at)}</TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUserId(coach.user_id);
                      setResettingName(coach.profiles?.full_name || 'this coach');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                    title="Reset Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset Password
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
              Are you sure you want to reset the password for <strong>{resettingName}</strong>? Their password will be set to the default and they will be required to change it on next login.
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
              Password for <strong>{resetResult.name}</strong> has been reset. Share these temporary credentials:
            </p>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                Password: <strong>{resetResult.password}</strong>
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              They will be required to change this password on their next login.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetResult(null)}
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
