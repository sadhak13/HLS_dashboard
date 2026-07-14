"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle, XCircle, Send, CalendarDays, Users, Search,
  Clock, CheckCheck, X, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

interface Player {
  id: string;
  full_name: string;
  status: 'active' | 'inactive';
}

interface BatchOption {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  branch_name: string;
}

type AttendanceStatus = 'present' | 'absent';

interface AttendanceState {
  [playerId: string]: AttendanceStatus;
}

function getTodayString() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function MiniCalendar({
  selectedDate,
  onDateChange,
  markedDates,
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
  markedDates?: Set<string>;
}) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = getTodayString();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

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
          const hasRecord = markedDates?.has(dateStr);
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
              {hasRecord && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CoachAttendancePage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [branchId, setBranchId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());

  const today = getTodayString();
  const isToday = selectedDate === today;

  const fetchBatches = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);

    const { data: coachData } = await (supabase as any)
      .from('coaches')
      .select('id, branch_id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!coachData) { setIsLoading(false); return; }
    setBranchId(coachData.branch_id);
    setCoachId(coachData.id);

    const { data: coachBatches } = await (supabase as any)
      .from('coach_batches')
      .select('batch_id, batches (id, name, start_time, end_time, branch_id, branches (name))')
      .eq('coach_id', coachData.id);

    if (coachBatches && coachBatches.length > 0) {
      const batchOptions: BatchOption[] = coachBatches.map((cb: any) => ({
        id: cb.batches.id,
        name: cb.batches.name,
        start_time: cb.batches.start_time,
        end_time: cb.batches.end_time,
        branch_name: cb.batches.branches?.name || '',
      }));
      setBatches(batchOptions);
      if (batchOptions.length === 1) {
        setSelectedBatchId(batchOptions[0].id);
      } else {
        setIsLoading(false);
      }
    } else {
      setBatches([]);
      setSelectedBatchId(null);
      setIsLoading(false);
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch marked dates for the calendar dots
  const fetchMarkedDates = useCallback(async () => {
    if (!coachId) return;
    const batchIds = batches.map(b => b.id);
    if (batchIds.length === 0 && !branchId) return;

    let query = (supabase as any)
      .from('attendance')
      .select('date');

    if (batchIds.length > 0) {
      query = query.in('batch_id', batchIds);
    } else if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data } = await query;
    if (data) {
      const dates = new Set<string>(data.map((r: any) => r.date));
      setMarkedDates(dates);
    }
  }, [coachId, batches, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlayersForBatch = useCallback(async (batchId: string, date: string) => {
    setIsLoading(true);
    setAlreadySubmitted(false);
    setSubmitSuccess(false);
    setAttendance({});

    const { data: batchInfo } = await (supabase as any)
      .from('batches')
      .select('branch_id')
      .eq('id', batchId)
      .single();

    const batchBranchId = batchInfo?.branch_id || branchId;
    if (batchBranchId) setBranchId(batchBranchId);

    const { data: playersData } = await (supabase as any)
      .from('players')
      .select('id, full_name, status')
      .eq('batch_id', batchId)
      .eq('status', 'active')
      .order('full_name');

    let playerList = playersData ?? [];

    if (playerList.length === 0 && batchBranchId) {
      const { data: branchPlayers } = await supabase
        .from('players')
        .select('id, full_name, status')
        .eq('branch_id', batchBranchId)
        .eq('status', 'active')
        .order('full_name');
      playerList = branchPlayers ?? [];
    }

    setPlayers(playerList as Player[]);

    if (playerList.length > 0) {
      const { data: existingAttendance } = await (supabase as any)
        .from('attendance')
        .select('player_id, status')
        .eq('batch_id', batchId)
        .eq('date', date);

      if (existingAttendance && existingAttendance.length > 0) {
        setAlreadySubmitted(true);
        const existing: AttendanceState = {};
        existingAttendance.forEach((r: any) => {
          existing[r.player_id] = r.status as AttendanceStatus;
        });
        setAttendance(existing);
      } else {
        if (date === today) {
          const defaults: AttendanceState = {};
          playerList.forEach((p: any) => { defaults[p.id] = 'present'; });
          setAttendance(defaults);
        } else {
          setAttendance({});
          setAlreadySubmitted(true);
        }
      }
    }

    setIsLoading(false);
  }, [branchId, today]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetchMarkedDates();
  }, [fetchMarkedDates]);

  useEffect(() => {
    if (selectedBatchId) {
      loadPlayersForBatch(selectedBatchId, selectedDate);
    }
  }, [selectedBatchId, selectedDate, loadPlayersForBatch]);

  const toggle = (playerId: string) => {
    if (alreadySubmitted) return;
    setAttendance((prev) => ({
      ...prev,
      [playerId]: prev[playerId] === 'present' ? 'absent' : 'present',
    }));
  };

  const markAllPresent = () => {
    if (alreadySubmitted) return;
    const all: AttendanceState = {};
    players.forEach(p => { all[p.id] = 'present'; });
    setAttendance(all);
  };

  const markAllAbsent = () => {
    if (alreadySubmitted) return;
    const all: AttendanceState = {};
    players.forEach(p => { all[p.id] = 'absent'; });
    setAttendance(all);
  };

  const handleSubmit = async () => {
    if (!branchId || isSubmitting) return;
    setIsSubmitting(true);

    const records = players.map((p) => ({
      player_id: p.id,
      branch_id: branchId,
      batch_id: selectedBatchId || null,
      date: selectedDate,
      status: attendance[p.id] ?? 'present',
    }));

    const { error } = await (supabase as any).from('attendance').insert(records);

    if (!error) {
      setAlreadySubmitted(true);
      setSubmitSuccess(true);
      setMarkedDates(prev => new Set([...prev, selectedDate]));
    }

    setIsSubmitting(false);
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length;
  const attendancePct = players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0;

  const filteredPlayers = players.filter(player =>
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  if (isLoading && batches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mark Attendance</h1>
        <p className="text-sm text-gray-400 mt-1">Select a date and batch to mark or view attendance.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left Panel: Calendar + Batch Filter ── */}
        <div className="w-full lg:w-72 space-y-4 shrink-0">
          {/* Calendar */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              markedDates={markedDates}
            />
          </div>

          {/* Batch Filter */}
          {batches.length > 0 && (
            <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Batch</span>
              </div>
              {batches.length <= 3 ? (
                <div className="space-y-2">
                  {batches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedBatchId(batch.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                        selectedBatchId === batch.id
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        selectedBatchId === batch.id
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/[0.05] text-gray-400'
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          selectedBatchId === batch.id ? 'text-green-300' : 'text-white'
                        }`}>{batch.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {batch.branch_name} · {formatTime(batch.start_time)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={selectedBatchId ?? ''}
                  onChange={(e) => setSelectedBatchId(e.target.value || null)}
                  className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900">
                      {b.name} ({formatTime(b.start_time)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Summary Stats */}
          {selectedBatchId && !isLoading && players.length > 0 && (
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
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300">Rate</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{attendancePct}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Attendance Content ── */}
        <div className="flex-1 min-w-0">
          {/* Date + Batch Info Header */}
          <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CalendarDays className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">{formatDisplayDate(selectedDate)}</p>
                  {selectedBatch && (
                    <p className="text-xs text-gray-400">
                      {selectedBatch.name} · {selectedBatch.branch_name} · {formatTime(selectedBatch.start_time)} – {formatTime(selectedBatch.end_time)}
                    </p>
                  )}
                </div>
              </div>
              {isToday && !alreadySubmitted && selectedBatchId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
                  Pending
                </span>
              )}
              {alreadySubmitted && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  submitSuccess
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}>
                  <CheckCheck className="w-3.5 h-3.5" />
                  {submitSuccess ? 'Submitted' : 'Marked'}
                </span>
              )}
            </div>
          </div>

          {/* No batch selected */}
          {!selectedBatchId && batches.length > 0 && (
            <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-white font-medium mb-1">Select a Batch</p>
              <p className="text-sm text-gray-400">Choose which batch to mark attendance for.</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && selectedBatchId && (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Main content when batch is selected and loaded */}
          {!isLoading && selectedBatchId && (
            <>
              {/* Search & Actions */}
              {players.length > 0 && !alreadySubmitted && isToday && (
                <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={markAllPresent}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs sm:text-sm font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">All Present</span>
                        <span className="sm:hidden">All P</span>
                      </button>
                      <button
                        onClick={markAllAbsent}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-medium hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">All Absent</span>
                        <span className="sm:hidden">All A</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Player List */}
              {players.length === 0 ? (
                <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-white font-medium mb-1">No Active Players</p>
                  <p className="text-sm text-gray-400">There are no active players in this batch yet.</p>
                </div>
              ) : Object.keys(attendance).length === 0 && !isToday ? (
                <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-white font-medium mb-1">No Records</p>
                  <p className="text-sm text-gray-400">No attendance was recorded for this date.</p>
                </div>
              ) : (
                <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                  </div>

                  {/* Player Rows */}
                  <div className="divide-y divide-white/5">
                    {filteredPlayers.map((player, index) => {
                      const status = attendance[player.id];
                      const isPresent = status === 'present';
                      const canToggle = !alreadySubmitted && isToday;

                      return (
                        <button
                          key={player.id}
                          onClick={() => toggle(player.id)}
                          disabled={!canToggle}
                          className={`w-full grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 text-left transition-all ${
                            canToggle
                              ? 'cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]'
                              : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors shrink-0 ${
                              isPresent
                                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                : 'bg-red-500/20 border border-red-500/30 text-red-400'
                            }`}>
                              {player.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white text-sm truncate">{player.full_name}</p>
                              <p className="text-[11px] text-gray-500">#{index + 1}</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            {status ? (
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                isPresent
                                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                              }`}>
                                {isPresent ? (
                                  <><CheckCircle className="w-3.5 h-3.5" /> Present</>
                                ) : (
                                  <><XCircle className="w-3.5 h-3.5" /> Absent</>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {!alreadySubmitted && isToday && players.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Send className="w-5 h-5" />
                    {isSubmitting ? 'Submitting...' : 'Save Attendance'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
