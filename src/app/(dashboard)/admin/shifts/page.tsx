'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Department, DEPARTMENT_LABELS, ShiftStatus } from '@/types/database.types';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminShift {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  assigned_task: string | null;
  notes: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    student_id: string | null;
    department: Department;
    sub_departments?: Department[];
  } | null;
}

const PRESET_TASKS = [
  'サスペンション組立・ジオメトリ調整',
  '低圧/高圧ハーネス導通確認',
  'カウルCFRP積層・脱型作業',
  'アップライトマシニング加工',
  '試走会前安全チェック・静的車検対策',
  'デザイン審査資料作成・レビュー',
  'コスト＆マニュファクチャリング提出準備',
  '内燃エンジン台上適合試験',
];

export default function AdminShiftsPage() {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [shifts, setShifts] = useState<AdminShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showAllDates, setShowAllDates] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // タスク割り当てモーダル
  const [taskModalShift, setTaskModalShift] = useState<AdminShift | null>(null);
  const [taskInput, setTaskInput] = useState('');

  // シフト取得
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase.from('shifts') as any)
        .select(`
          id,
          user_id,
          date,
          start_time,
          end_time,
          status,
          assigned_task,
          notes,
          created_at,
          profile:profiles ( id, full_name, student_id, department, sub_departments )
        `)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!showAllDates && selectedDate) {
        query = query.eq('date', selectedDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching shifts:', error);
      } else {
        setShifts((data as unknown as AdminShift[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedDate, showAllDates]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // ステータス更新（承認 / 却下）
  const handleUpdateStatus = async (shiftId: string, newStatus: ShiftStatus) => {
    setActionLoadingId(shiftId);
    try {
      const { error } = await (supabase.from('shifts') as any)
        .update({ status: newStatus })
        .eq('id', shiftId);

      if (error) {
        alert('更新に失敗しました: ' + error.message);
      } else {
        setShifts((prev) =>
          prev.map((s) => (s.id === shiftId ? { ...s, status: newStatus } : s))
        );
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 一括承認（表示中の申請中シフトを一括承認）
  const handleBulkApprove = async () => {
    const pendingShifts = filteredShifts.filter((s) => s.status === 'submitted');
    if (pendingShifts.length === 0) {
      alert('承認待ちのシフトはありません');
      return;
    }
    if (!confirm(`表示中の申請中シフト ${pendingShifts.length} 件を一括承認しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const ids = pendingShifts.map((s) => s.id);
      const { error } = await (supabase.from('shifts') as any)
        .update({ status: 'confirmed' })
        .in('id', ids);

      if (error) {
        alert('一括承認に失敗しました: ' + error.message);
      } else {
        await fetchShifts();
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // タスク保存
  const handleSaveTask = async () => {
    if (!taskModalShift) return;
    setActionLoadingId(taskModalShift.id);
    try {
      const { error } = await (supabase.from('shifts') as any)
        .update({ assigned_task: taskInput.trim() || null })
        .eq('id', taskModalShift.id);

      if (error) {
        alert('タスク保存に失敗しました: ' + error.message);
      } else {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === taskModalShift.id
              ? { ...s, assigned_task: taskInput.trim() || null }
              : s
          )
        );
        setTaskModalShift(null);
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 日付操作
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setShowAllDates(false);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
    setShowAllDates(false);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
    setShowAllDates(false);
  };

  // フィルタリング
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (selectedDept !== 'all' && s.profile?.department !== selectedDept) {
        return false;
      }
      if (selectedStatus !== 'all' && s.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.profile?.full_name?.toLowerCase().includes(q);
        const idMatch = s.profile?.student_id?.toLowerCase().includes(q);
        const taskMatch = s.assigned_task?.toLowerCase().includes(q);
        return nameMatch || idMatch || taskMatch;
      }
      return true;
    });
  }, [shifts, selectedDept, selectedStatus, searchQuery]);

  const pendingCount = filteredShifts.filter((s) => s.status === 'submitted').length;
  const confirmedCount = filteredShifts.filter((s) => s.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* ─── 日付セレクター & クイックアクション ─────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* 日付ナビゲーション */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="前日"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setShowAllDates(false);
              }}
              className="bg-slate-950 border border-slate-800 text-white text-sm font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="翌日"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              今日
            </button>
            <button
              onClick={() => setShowAllDates(!showAllDates)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition border',
                showAllDates
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              )}
            >
              全期間表示
            </button>
          </div>

          {/* 一括承認ボタン */}
          {pendingCount > 0 && (
            <button
              onClick={handleBulkApprove}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>申請中 {pendingCount} 件を一括承認</span>
            </button>
          )}
        </div>

        {/* 統計バー */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">
            合計: <strong className="text-white">{filteredShifts.length}</strong> 件
          </span>
          <span className="text-emerald-400">
            確定: <strong>{confirmedCount}</strong> 件
          </span>
          <span className="text-amber-400">
            承認待ち: <strong>{pendingCount}</strong> 件
          </span>
        </div>
      </div>

      {/* ─── 検索 & フィルターバー ───────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="部員名・学籍番号・タスク名検索"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 班フィルター */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">すべての班</option>
            {Object.entries(DEPARTMENT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {/* ステータスフィルター */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">すべての状態</option>
            <option value="submitted">申請中 (未承認)</option>
            <option value="confirmed">確定 (承認済)</option>
            <option value="rejected">却下</option>
            <option value="canceled">取り消し済</option>
          </select>
        </div>
      </div>

      {/* ─── シフト一覧 ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">提出されたシフトはありません</p>
          <p className="text-xs text-slate-500">
            {showAllDates ? 'シフトがまだ提出されていません' : '別の日付を選択するか「全期間表示」をお試しください'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift) => {
            const isProcessing = actionLoadingId === shift.id;
            return (
              <div
                key={shift.id}
                className={cn(
                  'bg-slate-900 border rounded-2xl p-4 sm:p-5 transition space-y-3',
                  shift.status === 'confirmed'
                    ? 'border-slate-800 hover:border-emerald-500/40'
                    : shift.status === 'submitted'
                    ? 'border-amber-500/40 bg-gradient-to-r from-slate-900 via-amber-950/10 to-slate-900'
                    : 'border-slate-800/80 opacity-75'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* 部員情報 & 日時 */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">
                          {shift.profile?.full_name ?? '不明部員'}
                        </span>
                        {shift.profile?.student_id && (
                          <span className="text-xs text-slate-400 font-mono">
                            ({shift.profile.student_id})
                          </span>
                        )}
                        {/* ステータスバッジ */}
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            shift.status === 'confirmed'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : shift.status === 'submitted'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : shift.status === 'rejected'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          )}
                        >
                          {shift.status === 'confirmed'
                            ? '確定'
                            : shift.status === 'submitted'
                            ? '申請中'
                            : shift.status === 'rejected'
                            ? '却下'
                            : '取消済'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {shift.profile?.department
                            ? DEPARTMENT_LABELS[shift.profile.department]
                            : '班未設定'}
                        </span>
                        {shift.profile?.sub_departments &&
                          shift.profile.sub_departments.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              (兼: {shift.profile.sub_departments.map((d) => DEPARTMENT_LABELS[d]).join(', ')})
                            </span>
                          )}
                        <span>•</span>
                        <span className="font-mono text-slate-300">{shift.date}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {shift.start_time.slice(0, 5)} 〜 {shift.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {/* タスク割り当てボタン */}
                    <button
                      onClick={() => {
                        setTaskModalShift(shift);
                        setTaskInput(shift.assigned_task || '');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="作業タスクの割り当て"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{shift.assigned_task ? 'タスク変更' : 'タスク割当'}</span>
                    </button>

                    {/* 承認ボタン */}
                    {shift.status !== 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(shift.id, 'confirmed')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>承認</span>
                      </button>
                    )}

                    {/* 却下ボタン */}
                    {shift.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(shift.id, 'rejected')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800/40 text-xs font-semibold transition disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>却下</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 割り当て済みタスク & 備考表示 */}
                {(shift.assigned_task || shift.notes) && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    {shift.assigned_task && (
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30 text-[10px]">
                          割当タスク
                        </span>
                        <span className="font-semibold text-slate-200">
                          {shift.assigned_task}
                        </span>
                      </div>
                    )}
                    {shift.notes && (
                      <div className="text-slate-400 flex items-start gap-2">
                        <span className="text-slate-500 font-medium">部員メモ:</span>
                        <span>{shift.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── タスク割り当てモーダル ─────────────────────────────────── */}
      {taskModalShift && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setTaskModalShift(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">作業タスク割り当て</h3>
                  <p className="text-xs text-slate-400">
                    {taskModalShift.profile?.full_name} さん ({taskModalShift.date}{' '}
                    {taskModalShift.start_time.slice(0, 5)}〜{taskModalShift.end_time.slice(0, 5)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTaskModalShift(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                割り当てるタスク名
              </label>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="例: フロントサスペンション調整・車検チェックリスト作成"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
              />
            </div>

            {/* 定型タスクチップ */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                クイック入力（候補）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TASKS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTaskInput(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setTaskModalShift(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveTask}
                disabled={actionLoadingId === taskModalShift.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-racing-red hover:bg-racing-red/90 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {actionLoadingId === taskModalShift.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                タスクを確定保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
