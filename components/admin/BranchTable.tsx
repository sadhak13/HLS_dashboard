"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit2, MapPin, MoreHorizontal } from 'lucide-react';
import type { Database } from '@/types/database.types';
import { formatDate } from '@/utils/formatDate';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchTableProps {
  branches: Branch[];
  isLoading: boolean;
}

export function BranchTable({ branches, isLoading }: BranchTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg border-gray-200 dark:border-gray-700 h-64">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading branches...</span>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Branch Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Added On</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {branches.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
              No branches found. Add one to get started!
            </TableCell>
          </TableRow>
        ) : (
          branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{branch.name}</div>
                    <div className="text-xs text-gray-500">{branch.id.substring(0, 8)}...</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{branch.location}</TableCell>
              <TableCell>{formatDate(branch.created_at)}</TableCell>
              <TableCell>
                <Badge variant="success">Active</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
