'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Department, DEPARTMENT_LABELS } from '@/types/database.types';
import {
  Radio,
  MapPin,
  Clock,
  User,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveWorker {
  id: string; // checkin id
  user_id: string;
  checkin_at: string;
  distance_meters: number;
  notes: string | null;
  status: string;
  location: {
    id: string;
    name: string;
  } | null;
  profile: {
    id: string;
    full_name: string;
    student_id: string | null;
    department: Department;
    sub_departments?: Department[];
    role: string;
  } | null;
}

export default function AdminRealtimePage() {
  const supabase = createClient();

  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [forceCheckoutTarget, setForceCheckoutTarget] = useState<ActiveWorker | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1秒ごとに時計を更新してリアルタイム経過時間を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // アクティブ作業者一覧取得
  const fetchActiveWorkers = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('checkins') as any)
        .select(`
          id,
          user_id,
          checkin_at,
          distance_meters,
          notes,
          status,
          location:locations ( id, name ),
          profile:profiles ( id, full_name, student_id, department, sub_departments, role )
        `)
        .eq('status', 'working')
        .order('checkin_at', { ascending: false });

      if (error) {
        console.error('Error fetching active workers:', error);
      } else {
        setWorkers((data as unknown as ActiveWorker[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 初回読み込み & Supabase Realtime 購読
  useEffect(() => {
    fetchActiveWorkers();

    const channel = supabase
      .channel('admin-realtime-checkins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins' },
        () => {
          fetchActiveWorkers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveWorkers, supabase]);

  // 強制チェックアウト処理
  const handleForceCheckout = async (worker: ActiveWorker) => {
    setProcessingId(worker.id);
    try {
      const { error } = await (supabase.from('checkins') as any)
        .update({
          checkout_at: new Date().toISOString(),
          status: 'auto_closed',
          notes: worker.notes
            ? `${worker.notes} (管理者による強制退勤)`
            : '管理者による強制退勤',
        })
        .eq('id', worker.id);

      if (error) {
        alert('退勤処理に失敗しました: ' + error.message);
      } else {
        setForceCheckoutTarget(null);
        await fetchActiveWorkers();
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 経過時間計算フォーマッター
  const getElapsedTime = (checkinAt: string) => {
    const diffMs = Math.max(0, now - new Date(checkinAt).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // フィルタリング処理
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (selectedDept !== 'all' && w.profile?.department !== selectedDept) {
        return false;
      }
      if (selectedLocation !== 'all' && w.location?.id !== selectedLocation) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = w.profile?.full_name?.toLowerCase().includes(q);
        const idMatch = w.profile?.student_id?.toLowerCase().includes(q);
        return nameMatch || idMatch;
      }
      return true;
    });
  }, [workers, selectedDept, selectedLocation, searchQuery]);

  // 統計計算
  const uniqueLocations = useMemo(() => {
    const map = new Map<string, string>();
    workers.forEach((w) => {
      if (w.location) {
        map.set(w.location.id, w.location.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [workers]);

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    workers.forEach((w) => {
      const dept = w.profile?.department ?? 'other';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [workers]);

  return (
    <div className="space-y-6">
      {/* ─── リアルタイム状況サマリー ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 全体稼働人数 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs font-semibold text-slate-400">現在作業中</p>
            </div>
            <p className="text-3xl font-black text-white mt-2">
              {workers.length}
              <span className="text-sm font-normal text-slate-400 ml-1.5">名</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* 拠点別内訳 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 sm:col-span-2">
          <p className="text-xs font-semibold text-slate-400 mb-2">拠点別人数</p>
          <div className="flex flex-wrap gap-2">
            {uniqueLocations.length === 0 ? (
              <p className="text-xs text-slate-500">現在作業中の拠点はありません</p>
            ) : (
              uniqueLocations.map((loc) => {
                const count = workers.filter((w) => w.location?.id === loc.id).length;
                return (
                  <div
                    key={loc.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{loc.name}:</span>
                    <span className="font-bold text-white">{count}名</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── フィルター & 検索バー ───────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* 検索入力 */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="部員名・学籍番号で絞り込み"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* 班別フィルター */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="all">すべての班</option>
              {Object.entries(DEPARTMENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label} {deptCounts[k] ? `(${deptCounts[k]})` : ''}
                </option>
              ))}
            </select>

            {/* 拠点別フィルター */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="all">すべての拠点</option>
              {uniqueLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            {/* 手動リフレッシュ */}
            <button
              onClick={() => fetchActiveWorkers()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              <span>更新</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 作業中メンバーグリッド ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">現在作業中のメンバーはいません</p>
          <p className="text-xs text-slate-500">
            {searchQuery || selectedDept !== 'all' || selectedLocation !== 'all'
              ? '条件に一致する作業者が見つかりません'
              : 'ガレージにチェックインした部員がここにリアルタイム表示されます'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => {
            const isProcessing = processingId === worker.id;
            return (
              <div
                key={worker.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition shadow-lg relative overflow-hidden"
              >
                {/* 稼働中インジケータ */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

                {/* ユーザー基本情報 */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">
                        {worker.profile?.full_name ?? '不明なユーザー'}
                      </span>
                      {worker.profile?.student_id && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({worker.profile.student_id})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {worker.profile?.department
                          ? DEPARTMENT_LABELS[worker.profile.department]
                          : '班未設定'}
                      </span>
                      {worker.profile?.sub_departments &&
                        worker.profile.sub_departments.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            兼: {worker.profile.sub_departments.map((d) => DEPARTMENT_LABELS[d]).join(', ')}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* 経過時間バッジ */}
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                      <Clock className="w-3 h-3 text-emerald-400 animate-spin" />
                      <span>{getElapsedTime(worker.checkin_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 作業詳細（場所・距離・開始時刻） */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      作業場所:
                    </span>
                    <span className="font-semibold text-white">
                      {worker.location?.name ?? '指定外拠点'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      打刻時刻:
                    </span>
                    <span className="font-mono">
                      {new Date(worker.checkin_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">GPS許容内誤差:</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round(worker.distance_meters)}m
                    </span>
                  </div>

                  {worker.notes && (
                    <div className="pt-1 border-t border-slate-800 text-slate-400">
                      <span className="text-slate-500 font-medium">作業内容: </span>
                      <span className="text-slate-300">{worker.notes}</span>
                    </div>
                  )}
                </div>

                {/* 強制退勤アクション */}
                <div className="pt-1">
                  <button
                    onClick={() => setForceCheckoutTarget(worker)}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-xs font-semibold transition"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>強制退勤処理</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 強制退勤確認モーダル ─────────────────────────────────── */}
      {forceCheckoutTarget && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setForceCheckoutTarget(null)}
        >
          <div
            className="bg-slate-900 border border-red-800/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">強制退勤の確認</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">
                {forceCheckoutTarget.profile?.full_name}
              </span>
              さんを今すぐ強制退勤処理しますか？
              <br />
              <span className="text-slate-400 text-[11px] mt-1 block">
                退勤時刻は現在時刻で記録され、作業ステータスは完了（auto_closed）になります。
              </span>
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setForceCheckoutTarget(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleForceCheckout(forceCheckoutTarget)}
                disabled={processingId === forceCheckoutTarget.id}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {processingId === forceCheckoutTarget.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                退勤させる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
