"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, Filter } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent';
  players: { full_name: string } | null;
  branches: { name: string } | null;
}

export default function AdminAttendancePage() {
  const supabase = createClient();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      if (data) setBranches(data);
    };
    fetchBranches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('attendance')
      .select(`*, players(full_name), branches(name)`)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true });

    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }

    const { data } = await query;
    setRecords((data as AttendanceRecord[]) ?? []);
    setIsLoading(false);
  }, [selectedDate, selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">View daily attendance records across all branches.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white appearance-none"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary pills */}
      {records.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">✅ {presentCount} Present</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">❌ {absentCount} Absent</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">📊 {attendancePct}% Rate</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {records.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No attendance records found for this date.</p>
            <p className="text-sm text-gray-400 mt-1">Coaches mark attendance from the Coach App.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex justify-center">
                      <svg className="w-6 h-6 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {record.players?.full_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{record.branches?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{new Date(record.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'present' ? 'success' : 'danger'}>
                        {record.status === 'present' ? 'Present' : 'Absent'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
