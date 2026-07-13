"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, Send, CalendarDays, Users, Search, Clock, CheckCheck, X } from 'lucide-react';

interface Player {
  id: string;
  full_name: string;
  status: 'active' | 'inactive';
}

type AttendanceStatus = 'present' | 'absent';

interface AttendanceState {
  [playerId: string]: AttendanceStatus;
}

function getTodayString() {
  // Use Indian Standard Time (IST) - UTC+5:30
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function CoachAttendancePage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const today = getTodayString();

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);

    // 1. Get the coach's branch
    // Try using the RPC function first
    const { data: rpcBranchId, error: rpcError } = await supabase.rpc('get_coach_branch_id');

    let resolvedBranchId: string = (rpcBranchId as any) as string;
    
    if (rpcError || !resolvedBranchId) {
      console.warn('RPC failed or returned null, falling back to direct table query...', rpcError);
      const { data: coachData } = await (supabase as any)
        .from('coaches')
        .select('branch_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!coachData) { setIsLoading(false); return; }
      resolvedBranchId = coachData.branch_id;
    }
    
    setBranchId(resolvedBranchId as string);

    // 2. Get all active players in this branch
    const { data: playersData } = await supabase
      .from('players')
      .select('id, full_name, status')
      .eq('branch_id', resolvedBranchId)
      .eq('status', 'active')
      .order('full_name');

    const playerList = (playersData as Array<{ id: string; full_name: string; status: string }>) ?? [];
    setPlayers(playerList as Player[]);

    // 3. Check if attendance was already submitted today
    if (playerList.length > 0) {
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('player_id, status')
        .eq('branch_id', resolvedBranchId)
        .eq('date', today);

      if (existingAttendance && existingAttendance.length > 0) {
        setAlreadySubmitted(true);
        const existing: AttendanceState = {};
        (existingAttendance as Array<{ player_id: string; status: string }>).forEach((r) => {
          existing[r.player_id] = r.status as AttendanceStatus;
        });
        setAttendance(existing);
      } else {
        // Default everyone to 'present'
        const defaults: AttendanceState = {};
        playerList.forEach((p) => { defaults[p.id] = 'present'; });
        setAttendance(defaults);
      }
    }

    setIsLoading(false);
  }, [profile, today]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      date: today,
      status: attendance[p.id] ?? 'present',
    }));

    const { error } = await supabase.from('attendance').insert(records as any);

    if (!error) {
      setAlreadySubmitted(true);
      setSubmitSuccess(true);
    }

    setIsSubmitting(false);
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length;

  const filteredPlayers = players.filter(player =>
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-green-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <CalendarDays className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">Attendance Tracker</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{formatDisplayDate(today)}</h1>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{players.length}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{presentCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-700 dark:text-red-400 font-medium">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{absentCount}</p>
          </div>
        </div>
      </div>

      {/* Already submitted banner */}
      {alreadySubmitted && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${submitSuccess ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${submitSuccess ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
            <CheckCheck className={`w-6 h-6 ${submitSuccess ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
          </div>
          <div>
            <p className={`font-semibold ${submitSuccess ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
              {submitSuccess ? 'Attendance Submitted Successfully!' : 'Attendance Already Marked'}
            </p>
            <p className={`text-sm ${submitSuccess ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'}`}>
              {submitSuccess ? 'All attendance records have been saved.' : 'Today\'s attendance has already been submitted.'}
            </p>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {!alreadySubmitted && players.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={markAllPresent}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 font-medium rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">All Present</span>
              </button>
              <button
                onClick={markAllAbsent}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">All Absent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Attendance List */}
      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Active Players</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">There are no active players in your branch yet.</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Search className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No players found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Player Name
            </div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center">
              Status
            </div>
          </div>

          {/* Player Rows */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPlayers.map((player, index) => {
              const isPresent = attendance[player.id] === 'present';
              return (
                <button
                  key={player.id}
                  onClick={() => toggle(player.id)}
                  disabled={alreadySubmitted}
                  className={`w-full grid grid-cols-[1fr_auto] gap-4 px-6 py-4 text-left transition-all ${
                    alreadySubmitted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 active:bg-gray-100 dark:active:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-white text-sm ${
                      isPresent ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {player.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{player.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Player #{index + 1}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isPresent ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">Present</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-400">Absent</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {!alreadySubmitted && players.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-colors shadow-lg shadow-green-600/20"
        >
          <Send className="w-5 h-5" />
          {isSubmitting ? 'Submitting Attendance...' : 'Submit Attendance'}
        </button>
      )}
    </div>
  );
}
