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

    const { data: rpcBranchId, error: rpcError } = await supabase.rpc('get_coach_branch_id');

    let resolvedBranchId: string = (rpcBranchId as any) as string;

    if (rpcError || !resolvedBranchId) {
      const { data: coachData } = await (supabase as any)
        .from('coaches')
        .select('branch_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!coachData) { setIsLoading(false); return; }
      resolvedBranchId = coachData.branch_id;
    }

    setBranchId(resolvedBranchId as string);

    const { data: playersData } = await supabase
      .from('players')
      .select('id, full_name, status')
      .eq('branch_id', resolvedBranchId)
      .eq('status', 'active')
      .order('full_name');

    const playerList = (playersData as Array<{ id: string; full_name: string; status: string }>) ?? [];
    setPlayers(playerList as Player[]);

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
  const attendancePct = players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0;

  const filteredPlayers = players.filter(player =>
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 -m-6 p-6 pb-24">
      {/* Header */}
      <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20">
              <CalendarDays className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Mark Attendance</p>
              <h1 className="text-lg font-bold text-white">{formatDisplayDate(today)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{players.length}</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Total</p>
        </div>
        <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-green-500/20 p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">{presentCount}</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Present</p>
        </div>
        <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-red-500/20 p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{absentCount}</p>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Absent</p>
        </div>
      </div>

      {/* Attendance Rate Bar */}
      {players.length > 0 && (
        <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Attendance Rate</span>
            <span className="text-sm font-bold text-green-400">{attendancePct}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${attendancePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Already submitted banner */}
      {alreadySubmitted && (
        <div className={`rounded-2xl p-4 mb-6 flex items-center gap-3 border ${
          submitSuccess
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-blue-500/10 border-blue-500/20'
        }`}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            submitSuccess ? 'bg-green-500/20' : 'bg-blue-500/20'
          }`}>
            <CheckCheck className={`w-5 h-5 ${submitSuccess ? 'text-green-400' : 'text-blue-400'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${submitSuccess ? 'text-green-300' : 'text-blue-300'}`}>
              {submitSuccess ? 'Attendance Submitted!' : 'Already Marked'}
            </p>
            <p className={`text-xs ${submitSuccess ? 'text-green-400/70' : 'text-blue-400/70'}`}>
              {submitSuccess ? 'All records saved successfully.' : "Today's attendance was already submitted."}
            </p>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {!alreadySubmitted && players.length > 0 && (
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
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">All Present</span>
              </button>
              <button
                onClick={markAllAbsent}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">All Absent</span>
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
          <p className="text-sm text-gray-400">There are no active players in your branch yet.</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 p-12 text-center">
          <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No players found matching &ldquo;{searchQuery}&rdquo;</p>
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
              const isPresent = attendance[player.id] === 'present';
              return (
                <button
                  key={player.id}
                  onClick={() => toggle(player.id)}
                  disabled={alreadySubmitted}
                  className={`w-full grid grid-cols-[1fr_auto] gap-4 px-5 py-4 text-left transition-all ${
                    alreadySubmitted
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-colors ${
                      isPresent
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                        : 'bg-red-500/20 border border-red-500/30 text-red-400'
                    }`}>
                      {player.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{player.full_name}</p>
                      <p className="text-[11px] text-gray-500">#{index + 1}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {/* iOS-style toggle pill */}
                    <div className={`relative flex items-center w-24 h-9 rounded-full transition-colors ${
                      isPresent
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}>
                      <div className={`absolute flex items-center justify-center w-[42px] h-7 rounded-full transition-all duration-300 ${
                        isPresent
                          ? 'left-1 bg-green-500 shadow-lg shadow-green-500/30'
                          : 'left-[calc(100%-46px)] bg-red-500 shadow-lg shadow-red-500/30'
                      }`}>
                        {isPresent ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className={`absolute text-[10px] font-bold uppercase tracking-wide transition-opacity ${
                        isPresent
                          ? 'right-3 text-green-400'
                          : 'left-3 text-red-400'
                      }`}>
                        {isPresent ? 'P' : 'A'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Submit Button */}
      {!alreadySubmitted && players.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent sm:relative sm:p-0 sm:mt-6 sm:bg-none">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Send className="w-5 h-5" />
            {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
