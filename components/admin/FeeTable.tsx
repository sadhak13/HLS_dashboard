"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Clock } from 'lucide-react';

interface FeeRecord {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  mode_of_payment: 'cash' | 'online' | 'cash+online' | null;
  paid_date: string | null;
  players: { full_name: string; branch_id: string } | null;
  branches: { name: string } | null;
}

interface FeeTableProps {
  fees: FeeRecord[];
  isLoading: boolean;
  onMarkPaid: (feeId: string) => void;
  onEdit?: (fee: FeeRecord) => void;
}

function formatMonth(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  paid: { variant: 'success', label: 'Paid' },
  pending: { variant: 'warning', label: 'Pending' },
  overdue: { variant: 'danger', label: 'Overdue' },
};

export const FeeTable = React.memo(function FeeTable({ fees, isLoading, onMarkPaid, onEdit }: FeeTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-8 h-8 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading fee records...</span>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Month</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment Mode</TableHead>
          <TableHead>Paid On</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              No fee records found.
            </TableCell>
          </TableRow>
        ) : (
          fees.map((fee) => {
            const cfg = statusConfig[fee.status];
            return (
              <TableRow key={fee.id}>
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {fee.players?.full_name ?? 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                  {fee.branches?.name ?? '—'}
                </TableCell>
                <TableCell className="text-sm">{formatMonth(fee.month)}</TableCell>
                <TableCell>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₹{fee.amount.toLocaleString('en-IN')}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                  {fee.mode_of_payment ? (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {fee.mode_of_payment === 'cash+online' ? 'Cash + Online' : fee.mode_of_payment === 'online' ? 'Online' : 'Cash'}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {fee.paid_date
                    ? new Date(fee.paid_date).toLocaleDateString('en-IN')
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => onEdit(fee)}
                      >
                        Edit
                      </Button>
                    )}
                    {fee.status !== 'paid' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 gap-1.5"
                        onClick={() => onMarkPaid(fee.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
});
