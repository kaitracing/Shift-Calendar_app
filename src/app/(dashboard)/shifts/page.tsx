'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShiftStatus, DEPARTMENT_LABELS, Department } from '@/types/database.types';
import { formatDate, formatTime } from '@/lib/utils';
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  FileText,
  HelpCircle,
  Loader2,
  CalendarCheck2,
  Users,
} from 'lucide-react';

interface Shift {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  assigned_task: string | null;
  notes: string | null;
  created_at: string;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // フォーム状態
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('18:00');
  const [notes, setNotes] = useState('');

  // 編集モーダル状態
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ユーザーID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchShifts = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      setErrorMsg('シフト情報の取得に失敗しました。');
    } else {
      setShifts(data as Shift[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  // シフト提出ハンドラ
  const handleSubmitShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (startTime >= endTime) {
      setErrorMsg('開始時刻は終了時刻より前の時間を指定してください。');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg('認証情報が見つかりません。再ログインしてください。');
        setSubmitting(false);
        return;
      }

      const { error } = await (supabase.from('shifts') as any).insert({
        user_id: user.id,
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes.trim() || null,
        status: 'submitted',
      });

      if (error) {
        setErrorMsg('シフトの提出に失敗しました: ' + error.message);
      } else {
        setSuccessMsg('シフト希望を提出しました！リーダーの確定をお待ちください。');
        setNotes('');
        await fetchShifts();
      }
    } catch (err: any) {
      setErrorMsg('提出処理中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  // シフト取り消し・削除
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('このシフト希望を取り消しますか？')) return;

    const supabase = createClient();
    const { error } = await supabase.from('shifts').delete().eq('id', shiftId);

    if (error) {
      alert('シフトの取り消しに失敗しました: ' + error.message);
    } else {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    }
  };

  // 編集開始
  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setEditDate(shift.date);
    setEditStartTime(shift.start_time.slice(0, 5));
    setEditEndTime(shift.end_time.slice(0, 5));
    setEditNotes(shift.notes || '');
  };

  // 編集保存
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    if (editStartTime >= editEndTime) {
      alert('開始時刻は終了時刻より前を指定してください。');
      return;
    }

    setIsUpdating(true);
    const supabase = createClient();
    const { error } = await (supabase.from('shifts') as any)
      .update({
        date: editDate,
        start_time: editStartTime,
        end_time: editEndTime,
        notes: editNotes.trim() || null,
      })
      .eq('id', editingShift.id);

    if (error) {
      alert('更新に失敗しました: ' + error.message);
    } else {
      setEditingShift(null);
      await fetchShifts();
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status: ShiftStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>確定済み</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" />
            <span>見送り</span>
          </span>
        );
      case 'canceled':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-700 text-slate-400">
            取り消し済
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>提出中（未確定）</span>
          </span>
        );
    }
  };

  // 今日以降のシフトと過去のシフトを分類
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingShifts = shifts.filter((s) => s.date >= todayStr);
  const pastShifts = shifts.filter((s) => s.date < todayStr);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 画面メインタイトル & 必須指定文言バナー */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              作業シフト希望提出
            </h1>
            <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">
              KAIT Racing Garage Shift Scheduler
            </p>
          </div>
        </div>

        {/* 要件指定の重要文言強調枠 */}
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/50 border-2 border-rose-600/60 shadow-lg">
          <p className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            「この日のこの時間帯なら実作業をしに行ける」
          </p>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            授業の空きコマ、放課後、休日にガレージや部室へ実作業をしに行ける日時を提出してください。
            各班リーダー（Manager）が全体の作業進捗に合わせて具体的なタスク（治具製作、電装配線、積層等）を割り当てます。
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* 提出フォーム */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-rose-500" />
          <span>新しい作業可能シフトを提出する</span>
        </h2>

        <form onSubmit={handleSubmitShift} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 日付 */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                実作業に行ける日 <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>

            {/* 開始時刻 */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                開始時刻 <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>

            {/* 終了時刻 */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                終了時刻 <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>
          </div>

          {/* 備考欄 */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              希望備考・連絡事項 <span className="text-slate-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 17時以降ならフルで実作業可、溶接可能、3限の空きコマのみ作業"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>提出中...</span>
                </>
              ) : (
                <>
                  <CalendarCheck2 className="w-5 h-5" />
                  <span>この日のこの時間帯でシフト提出する</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 自分の提出済みシフト一覧 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-400" />
            <span>あなたの提出シフト一覧</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            全 {shifts.length} 件 （確定: {shifts.filter((s) => s.status === 'confirmed').length} 件）
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p>シフト情報を読み込み中...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-white">提出されたシフトはありません</p>
            <p className="text-sm text-slate-400 mt-1">
              上のフォームから「この日のこの時間帯なら実作業をしに行ける」希望を提出してください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map((shift) => {
              const isPast = shift.date < todayStr;
              return (
                <div
                  key={shift.id}
                  className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                    isPast
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header: Date & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-rose-400" />
                        <span className="font-bold text-white text-base">
                          {formatDate(shift.date)}
                        </span>
                        {isPast && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                            過去
                          </span>
                        )}
                      </div>
                      {getStatusBadge(shift.status)}
                    </div>

                    {/* Time Window */}
                    <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {formatTime(shift.start_time)} 〜 {formatTime(shift.end_time)}
                      </span>
                    </div>

                    {/* Assigned Task by Manager */}
                    {shift.assigned_task ? (
                      <div className="mb-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-300">
                        <span className="font-bold block text-emerald-400 mb-0.5">
                          割り当て作業タスク:
                        </span>
                        <span>{shift.assigned_task}</span>
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-slate-500 italic">
                        作業タスク: リーダー確認中
                      </div>
                    )}

                    {/* Notes */}
                    {shift.notes && (
                      <p className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-lg mb-2">
                        <span className="text-slate-500 block mb-0.5 font-medium">希望備考:</span>
                        {shift.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons (Only allowed if status is submitted) */}
                  {shift.status === 'submitted' && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                      <button
                        onClick={() => handleOpenEdit(shift)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>編集</span>
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>取り消し</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {editingShift && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-rose-400" />
              <span>シフト希望の編集</span>
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  日付
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    開始時刻
                  </label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    終了時刻
                  </label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  備考
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {isUpdating ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
