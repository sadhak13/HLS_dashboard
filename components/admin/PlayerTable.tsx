"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit2, Trash2, UserCircle2 } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import type { Database } from '@/types/database.types';

type Player = Database['public']['Tables']['players']['Row'] & {
  branches?: { name: string } | null;
};

interface PlayerTableProps {
  players: Player[];
  isLoading: boolean;
  onEdit?: (player: Player) => void;
  onDelete?: (player: Player) => void;
}

function calculateAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export function PlayerTable({ players, isLoading, onEdit, onDelete }: PlayerTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-8 h-8 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading players...</span>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Parent / Contact</TableHead>
          <TableHead>Enrolled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              No players registered yet.
            </TableCell>
          </TableRow>
        ) : (
          players.map((player, idx) => (
            <TableRow key={player.id}>
              <TableCell className="text-gray-400 text-sm">{idx + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.full_name}</div>
                    <div className="text-xs text-gray-500">{formatDate(player.date_of_birth)}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-medium">{calculateAge(player.date_of_birth)}</span>
                <span className="text-gray-500 text-xs ml-1">yrs</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{player.branches?.name || 'Unassigned'}</span>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{player.parent_name}</div>
                <div className="text-xs text-gray-500">{player.parent_phone}</div>
              </TableCell>
              <TableCell className="text-sm">{formatDate(player.enrolled_date)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    player.status === 'active'
                      ? 'success'
                      : player.status === 'dropped'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {player.status === 'active' ? 'Active' : player.status === 'dropped' ? 'Dropped' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={() => onEdit(player)}>
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  )}
                  {onDelete && player.status !== 'dropped' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => onDelete(player)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
