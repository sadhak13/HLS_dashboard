"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { UserCircle } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';

interface CoachTableProps {
  coaches: any[];
  isLoading: boolean;
}

export function CoachTable({ coaches, isLoading }: CoachTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Coach</TableHead>
          <TableHead>Branch Assigned</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Added On</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coaches.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
                <div className="font-medium">{coach.branches?.name || 'Unassigned'}</div>
                <div className="text-xs text-gray-500">{coach.branches?.location}</div>
              </TableCell>
              <TableCell>{coach.phone || 'N/A'}</TableCell>
              <TableCell>{formatDate(coach.created_at)}</TableCell>
              <TableCell>
                <Badge variant="success">Active</Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
