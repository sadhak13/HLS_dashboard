"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, Filter, Users, CheckCircle, XCircle, TrendingUp, ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent';
  batch_id: string | null;
  players: { full_name: string } | null;
  branches: { name: string } | null;
  batches: { name: string } | null;
}

interface BatchOption {
  id: string;
  name: string;
  branch_id: string;
}

function MiniCalendar({ selectedDate, onDateChange }: { selectedDate: string; onDateChange: (date: string) => void }) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const monthStr = viewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));

  const formatDate = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-white">{monthStr}</span>
        <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] font-medium text-gray-500 py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = formatDate(day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          return (
            <button
              key={i}
              onClick={() => onDateChange(dateStr)}
              className={`relative w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : isToday
                    ? 'bg-white/10 text-green-400 border border-green-500/30'
                    : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAttendancePage() {
  const supabase = createClient();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: branchData } = await supabase.from('branches').select('id, name').order('name');
      if (branchData) setBranches(branchData);

      const { data: batchData } = await (supabase as any).from('batches').select('id, name, branch_id').order('start_time');
      if (batchData) setBatches(batchData);
    };
    fetchFilters();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBatches = selectedBranch === 'all'
    ? batches
    : batches.filter(b => b.branch_id === selectedBranch);

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setSelectedBatch('all');
  };

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from('attendance')
      .select(`*, players(full_name), branches(name), batches(name)`)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true });

    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }
    if (selectedBatch !== 'all') {
      query = query.eq('batch_id', selectedBatch);
    }

    const { data } = await query;
    setRecords((data as AttendanceRecord[]) ?? []);
    setIsLoading(false);
  }, [selectedDate, selectedBranch, selectedBatch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  const filteredRecords = records.filter((r) =>
    r.players?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayDate = new Date(selectedDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Attendance Overview</h1>
        <p className="text-sm text-gray-400 mt-1">View daily attendance records across all branches and batches.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Calendar & Filters */}
        <div className="w-full lg:w-72 space-y-4 shrink-0">
          {/* Calendar Card */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5">
            <MiniCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>

          {/* Branch Filter */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Branch</span>
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          {filteredBatches.length > 0 && (
            <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Batch</span>
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Batches</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Summary</span>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">Present</span>
                </div>
                <span className="text-lg font-bold text-green-400">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300">Absent</span>
                </div>
                <span className="text-lg font-bold text-red-400">{absentCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300">Rate</span>
                </div>
                <span className="text-lg font-bold text-blue-400">{attendancePct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Records Table */}
        <div className="flex-1 min-w-0">
          {/* Date display & Search */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CalendarDays className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{displayDate}</p>
                  <p className="text-xs text-gray-400">{records.length} records found</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search player..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-white font-medium mb-1">No attendance records</p>
                <p className="text-sm text-gray-400 text-center">No records found for this date. Coaches mark attendance from the Coach App.</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.02]">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Branch</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Batch</span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Status</span>
                </div>

                {/* Records */}
                <div className="divide-y divide-white/5">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-2 sm:gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      {/* Player */}
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold text-white ${
                          record.status === 'present' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                        }`}>
                          {record.players?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="font-medium text-white">{record.players?.full_name ?? '—'}</span>
                      </div>

                      {/* Branch */}
                      <div className="flex items-center sm:justify-start">
                        <span className="text-sm text-gray-400 sm:ml-0 ml-12">{record.branches?.name ?? '—'}</span>
                      </div>

                      {/* Batch */}
                      <div className="flex items-center sm:justify-start">
                        <span className="text-sm text-gray-400 sm:ml-0 ml-12">{record.batches?.name ?? '—'}</span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center sm:justify-center ml-12 sm:ml-0">
                        {record.status === 'present' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Absent
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
