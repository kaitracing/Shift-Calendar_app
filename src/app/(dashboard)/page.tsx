import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DEPARTMENT_LABELS, ROLE_LABELS } from '@/types/database.types';
import {
  Clock,
  MapPin,
  Calendar,
  Shield,
  ArrowRight,
  Users,
  CheckCircle,
  AlertTriangle,
  Flag,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ユーザーのプロファイル取得
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = profileData as {
    full_name: string;
    student_id: string | null;
    department: 'mechanical' | 'electrical' | 'aerodynamics_cooling' | 'management' | 'other';
    sub_departments?: ('mechanical' | 'electrical' | 'aerodynamics_cooling' | 'management' | 'other')[];
    role: 'admin' | 'manager' | 'member';
    is_banned: boolean;
  } | null;

  // 今日の自分のシフトがあるか確認
  const today = new Date().toISOString().split('T')[0];
  const { data: myShiftsToday } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today);

  // 現在作業中（チェックイン中）かどうか確認
  const { data: checkinData } = await supabase
    .from('checkins')
    .select('*, locations(name)')
    .eq('user_id', user.id)
    .eq('status', 'working')
    .order('checkin_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeCheckin = checkinData as any;

  // 現在作業中の全メンバー数
  const { count: activeWorkerCount } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'working');

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/20 text-rose-400 text-xs font-semibold mb-3 border border-rose-500/30">
              <Flag className="w-3.5 h-3.5" />
              <span>KAIT Racing Formula Project</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              ようこそ、{profile?.full_name || '部員'} さん！
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              所属班: <span className="font-semibold text-white">{profile ? DEPARTMENT_LABELS[profile.department] : '未設定'}</span>
              {profile?.sub_departments && profile.sub_departments.length > 0 && (
                <span className="text-slate-400 text-xs ml-1">
                  (兼: {profile.sub_departments.map((d) => DEPARTMENT_LABELS[d]).join(', ')})
                </span>
              )}
              {profile?.student_id && ` (${profile.student_id})`}
              {' ｜ '}権限: <span className="font-semibold text-white">{profile ? ROLE_LABELS[profile.role] : 'Member'}</span>
            </p>
          </div>

          {/* Current Status Badge */}
          <div className="flex-shrink-0 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-800">
              {activeCheckin ? (
                <div className="relative">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                </div>
              ) : (
                <Clock className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">現在のステータス</p>
              {activeCheckin ? (
                <div>
                  <p className="text-sm font-bold text-emerald-400">作業中（チェックイン済）</p>
                  <p className="text-xs text-slate-300">{activeCheckin.locations?.name || '拠点'}</p>
                </div>
              ) : (
                <p className="text-sm font-bold text-slate-300">待機中（未チェックイン）</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. 作業シフト提出カード */}
        <div className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 hover:border-rose-500/50 transition duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-600/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              作業シフト提出
            </h2>
            <p className="text-xs text-rose-400 font-semibold mb-2">
              「この日のこの時間帯なら実作業をしに行ける」
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              授業の空きコマや放課後の作業可能時間を提出します。リーダーが作業タスクを割り当てます。
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/shifts"
              className="inline-flex items-center gap-2 text-sm font-bold text-rose-400 hover:text-rose-300 transition"
            >
              <span>シフト希望を登録する</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* 2. GPSチェックインカード */}
        <div className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 hover:border-emerald-500/50 transition duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              GPS位置情報チェックイン
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              現場（ガレージ・部室）に到着したら打刻。GPS判定で150m以内の場合に出勤が完了します。
            </p>
            {activeCheckin ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>現在作業中です。作業終了時に打刻してください。</span>
              </div>
            ) : (
              <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400">
                作業開始ボタンを押して出欠を記録しましょう。
              </div>
            )}
          </div>
          <div className="mt-6">
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              <span>{activeCheckin ? '作業終了打刻へ' : '作業開始打刻へ'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* 3. 全体カレンダーカード */}
        <div className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 hover:border-sky-500/50 transition duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-600/10 text-sky-500 border border-sky-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              全体カレンダー
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              大会、試走会、学内試走、全体MTG、デザイン審査提出などの重要スケジュールを一覧確認できます。
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">走行系（試走会・大会）</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">審査系（締切）</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">事務系（MTG）</span>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-300 transition"
            >
              <span>カレンダーを開く</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* Realtime Worker Status Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">ガレージ作業状況</h3>
            <p className="text-xs text-slate-400">
              現在 <span className="font-bold text-emerald-400 text-sm">{activeWorkerCount || 0}</span> 名のメンバーが現場で作業中です。
            </p>
          </div>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <Link
            href="/admin/realtime"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>リアルタイムモニターを見る</span>
          </Link>
        )}
      </div>
    </div>
  );
}
