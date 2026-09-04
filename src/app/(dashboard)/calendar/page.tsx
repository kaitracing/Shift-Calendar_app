'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EventCategory } from '@/types/database.types';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  Edit2,
  Trash2,
  Flag,
  Loader2,
  Info,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  category: EventCategory;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface MyShift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'submitted' | 'confirmed' | 'rejected' | 'canceled';
}

interface Profile {
  id: string;
  role: 'admin' | 'manager' | 'member';
  full_name: string;
}

const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; pill: string; dot: string; badge: string }
> = {
  driving: {
    label: '走行系（大会・試走）',
    pill: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  judging: {
    label: '審査系（静的・提出）',
    pill: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  meeting: {
    label: '事務系（MTG・幹部会）',
    pill: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  general: {
    label: 'その他全体',
    pill: 'bg-slate-600/50 text-slate-300 border border-slate-500/40',
    dot: 'bg-slate-400',
    badge: 'bg-slate-600/50 text-slate-300 border-slate-500/30',
  },
};

const CATEGORIES: EventCategory[] = ['driving', 'judging', 'meeting', 'general'];
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateTimeJP(dateStr: string): string {
  try {
    const dt = new Date(dateStr);
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

function CategoryBadge({ category }: { category: EventCategory }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium border', cfg.badge)}>
      {cfg.label}
    </span>
  );
}

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();

  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // フィルター
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set([...CATEGORIES, 'shift_confirmed', 'shift_submitted'])
  );

  // モーダル
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // フォーム状態
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    category: 'general' as EventCategory,
  });

  // プロファイル取得
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase.from('profiles') as any)
        .select('id, role, full_name')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as Profile);
    };
    fetchProfile();
  }, []);

  // カレンダーデータ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startStr = toLocalDateStr(firstDay);
    const endStr = toLocalDateStr(lastDay);

    // イベント取得
    const { data: eventsData } = await (supabase.from('events') as any)
      .select('*')
      .or(`start_date.lte.${endStr}T23:59:59,end_date.gte.${startStr}T00:00:00`)
      .order('start_date', { ascending: true });

    setEvents((eventsData as unknown as Event[]) ?? []);

    // 自分のシフト取得
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: shiftsData } = await (supabase.from('shifts') as any)
        .select('id, date, start_time, end_time, status')
        .eq('user_id', user.id)
        .gte('date', startStr)
        .lte('date', endStr);
      setMyShifts((shiftsData as unknown as MyShift[]) ?? []);
    }

    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // グリッド計算
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayStr = toLocalDateStr(today);

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const isCanEdit = profile?.role === 'admin' || profile?.role === 'manager';

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getEventsForDay = (day: number): Event[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      if (!activeFilters.has(e.category)) return false;
      const start = e.start_date.slice(0, 10);
      const end = e.end_date.slice(0, 10);
      return start <= dateStr && dateStr <= end;
    });
  };

  const getShiftsForDay = (day: number): MyShift[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return myShifts.filter((s) => {
      if (s.status === 'confirmed' && !activeFilters.has('shift_confirmed')) return false;
      if (s.status === 'submitted' && !activeFilters.has('shift_submitted')) return false;
      if (s.status === 'rejected' || s.status === 'canceled') return false;
      return s.date === dateStr;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const openCreate = (dateStr?: string) => {
    const targetDate = dateStr || toLocalDateStr(today);
    setForm({
      title: '',
      description: '',
      start_date: `${targetDate}T09:00`,
      end_date: `${targetDate}T17:00`,
      category: 'general',
    });
    setEditingEvent(null);
    setFormError('');
    setShowCreateModal(true);
  };

  const openEdit = (event: Event) => {
    setForm({
      title: event.title,
      description: event.description ?? '',
      start_date: event.start_date.slice(0, 16),
      end_date: event.end_date.slice(0, 16),
      category: event.category,
    });
    setEditingEvent(event);
    setFormError('');
    setSelectedEvent(null);
    setShowCreateModal(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) {
      setFormError('タイトルを入力してください');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setFormError('開始・終了日時を入力してください');
      return;
    }
    if (form.start_date > form.end_date) {
      setFormError('終了日時は開始日時より後にしてください');
      return;
    }

    setSaving(true);
    setFormError('');

    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      category: form.category,
      created_by: user?.id ?? null,
    };

    let error;
    if (editingEvent) {
      ({ error } = await (supabase.from('events') as any).update(payload).eq('id', editingEvent.id));
    } else {
      ({ error } = await (supabase.from('events') as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      setFormError('保存に失敗しました: ' + error.message);
    } else {
      setShowCreateModal(false);
      setEditingEvent(null);
      fetchData();
    }
  };

  const deleteEvent = async (event: Event) => {
    setSaving(true);
    await (supabase.from('events') as any).delete().eq('id', event.id);
    setSaving(false);
    setShowDeleteConfirm(null);
    setSelectedEvent(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* ─── ヘッダー ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-sky-950/40 border border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                全体カレンダー
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                大会・試走会・重要審査締切・全体ミーティング・個人シフトの総合予定表
              </p>
            </div>
          </div>
          {isCanEdit && (
            <button
              onClick={() => openCreate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-racing-red hover:bg-racing-red/90 text-white text-sm font-semibold shadow-lg shadow-racing-red/25 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              イベント作成
            </button>
          )}
        </div>
      </div>

      {/* ─── カテゴリフィルター ──────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 mb-2.5">表示フィルター</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = activeFilters.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  active ? cfg.pill : 'bg-slate-800/60 text-slate-500 border-slate-700/60 opacity-60'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', active ? cfg.dot : 'bg-slate-500')} />
                {cfg.label}
              </button>
            );
          })}
          <button
            onClick={() => toggleFilter('shift_confirmed')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              activeFilters.has('shift_confirmed')
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/60 opacity-60'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', activeFilters.has('shift_confirmed') ? 'bg-emerald-400' : 'bg-slate-500')} />
            自分のシフト(確定)
          </button>
          <button
            onClick={() => toggleFilter('shift_submitted')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              activeFilters.has('shift_submitted')
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800/60 text-slate-500 border-slate-700/60 opacity-60'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', activeFilters.has('shift_submitted') ? 'bg-purple-400' : 'bg-slate-500')} />
            自分のシフト(申請中)
          </button>
        </div>
      </div>

      {/* ─── カレンダー本体 ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* 月切り替えバー */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {year}年 {month + 1}月
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-full transition-colors font-medium"
            >
              今月
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={cn(
                'py-2.5 text-center text-xs font-bold',
                i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-400'
              )}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="w-7 h-7 animate-spin text-racing-red" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[100px] border-b border-r border-slate-800/60 bg-slate-950/20"
                  />
                );
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
              const dayEvents = getEventsForDay(day);
              const dayShifts = getShiftsForDay(day);

              return (
                <div
                  key={day}
                  className={cn(
                    'group min-h-[100px] border-b border-r border-slate-800/60 p-1.5 transition-colors relative',
                    isToday ? 'bg-racing-red/5' : 'hover:bg-slate-800/30'
                  )}
                >
                  {/* 日付ヘッダー */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-racing-red text-white'
                          : dayOfWeek === 0
                          ? 'text-rose-400'
                          : dayOfWeek === 6
                          ? 'text-sky-400'
                          : 'text-slate-300'
                      )}
                    >
                      {day}
                    </span>
                    {isCanEdit && (
                      <button
                        onClick={() => openCreate(dateStr)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/80 rounded text-slate-400 hover:text-white transition-opacity"
                        title="この日にイベントを追加"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* イベントバッジ */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          'w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded font-medium border transition-transform active:scale-95 block',
                          CATEGORY_CONFIG[event.category]?.badge ?? CATEGORY_CONFIG.general.badge
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-1 font-medium">
                        +{dayEvents.length - 3} 件
                      </div>
                    )}

                    {/* シフトバッジ */}
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          'w-full truncate text-[10px] px-1.5 py-0.5 rounded font-medium border flex items-center gap-1',
                          shift.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        )}
                        title={`個人シフト: ${shift.start_time.slice(0, 5)}〜${shift.end_time.slice(0, 5)}`}
                      >
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{shift.start_time.slice(0, 5)}〜{shift.end_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 詳細モーダル ──────────────────────────────────────────── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CategoryBadge category={selectedEvent.category} />
                <h3 className="text-lg font-bold text-white leading-snug">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>{formatDateTimeJP(selectedEvent.start_date)}</span>
              </div>
              <div className="text-xs text-slate-400 pl-6">
                〜 {formatDateTimeJP(selectedEvent.end_date)}
              </div>
            </div>

            {selectedEvent.description && (
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60 text-sm text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
              </div>
            )}

            {isCanEdit && (
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => openEdit(selectedEvent)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  編集
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(selectedEvent);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-sm font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 作成・編集モーダル ──────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-racing-red" />
                {editingEvent ? 'イベントを編集' : 'イベントを作成'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  タイトル <span className="text-racing-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例: 第1回学内試走会、デザイン審査提出締切"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  カテゴリー
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const selected = form.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left',
                          selected
                            ? cfg.pill
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    開始日時 <span className="text-racing-red">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    終了日時 <span className="text-racing-red">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  詳細説明 <span className="text-slate-500">(任意)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="場所、持ち物、タイムスケジュール等の詳細"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveEvent}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-racing-red hover:bg-racing-red/90 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-lg shadow-racing-red/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingEvent ? '更新する' : '作成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 削除確認モーダル ──────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-slate-900 border border-red-800/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">イベントを削除</h3>
            </div>
            <p className="text-sm text-slate-300">
              「<span className="font-semibold text-white">{showDeleteConfirm.title}</span>」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteEvent(showDeleteConfirm)}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

