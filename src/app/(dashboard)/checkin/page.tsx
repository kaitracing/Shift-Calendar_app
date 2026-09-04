'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateDistanceMeters } from '@/lib/geo';
import { formatDate, formatTime } from '@/lib/utils';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Navigation,
  Loader2,
  StopCircle,
  PlayCircle,
  Building2,
  History,
  ShieldAlert,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

interface Checkin {
  id: string;
  user_id: string;
  location_id: string | null;
  checkin_at: string;
  checkout_at: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number;
  status: 'working' | 'completed' | 'auto_closed';
  notes: string | null;
  locations?: {
    name: string;
  } | null;
}

export default function CheckinPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [activeCheckin, setActiveCheckin] = useState<Checkin | null>(null);
  const [todayHistory, setTodayHistory] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS 状態
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);

  // 打刻中ローディング
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // テスト用シミュレーションモード (開発・遠隔地テスト用)
  const [simulationMode, setSimulationMode] = useState(false);

  // 経過作業時間タイマー
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // 初期データフェッチ
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // 1. 活動拠点マスター取得
    const { data: locData } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (locData && locData.length > 0) {
      const parsedLocs = locData as unknown as Location[];
      setLocations(parsedLocs);
      if (!selectedLocationId) {
        setSelectedLocationId(parsedLocs[0].id);
      }
    }

    // 2. 現在の作業中チェックイン取得
    const { data: activeData } = await supabase
      .from('checkins')
      .select('*, locations(name)')
      .eq('user_id', user.id)
      .eq('status', 'working')
      .order('checkin_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveCheckin((activeData as unknown as Checkin) || null);

    // 3. 今日の打刻履歴
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: historyData } = await supabase
      .from('checkins')
      .select('*, locations(name)')
      .eq('user_id', user.id)
      .gte('checkin_at', today.toISOString())
      .order('checkin_at', { ascending: false });

    setTodayHistory((historyData as unknown as Checkin[]) || []);
    setLoading(false);
  }, [selectedLocationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 作業中経過時間のリアルタイム更新タイマー
  useEffect(() => {
    if (!activeCheckin) {
      setElapsedTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeCheckin.checkin_at).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);

      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      const fmt = (n: number) => String(n).padStart(2, '0');
      setElapsedTime(`${fmt(hours)}:${fmt(minutes)}:${fmt(seconds)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCheckin]);

  // GPS 取得 & 距離計算ロジック
  const measureGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    setSuccessMessage(null);

    const targetLoc = locations.find((l) => l.id === selectedLocationId);
    if (!targetLoc) {
      setGpsLoading(false);
      return;
    }

    if (simulationMode) {
      // テストシミュレーション: 拠点の座標から2メートル地点として判定
      const simCoords = {
        latitude: targetLoc.latitude + 0.00001,
        longitude: targetLoc.longitude + 0.00001,
        accuracy: 5,
      };
      setCurrentCoords(simCoords);
      const dist = calculateDistanceMeters(
        simCoords.latitude,
        simCoords.longitude,
        targetLoc.latitude,
        targetLoc.longitude
      );
      setCalculatedDistance(dist);
      setIsWithinRadius(dist <= targetLoc.radius_meters);
      setGpsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('お使いのブラウザは位置情報（Geolocation API）に対応していません。');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentCoords(coords);

        const dist = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          targetLoc.latitude,
          targetLoc.longitude
        );

        setCalculatedDistance(dist);
        setIsWithinRadius(dist <= targetLoc.radius_meters);
        setGpsLoading(false);
      },
      (err) => {
        let msg = '位置情報の取得に失敗しました。';
        if (err.code === 1) {
          msg = '位置情報の利用が許可されていません。ブラウザの設定から位置情報の利用を許可してください。';
        } else if (err.code === 2) {
          msg = '位置情報を特定できませんでした。電波の良い場所で再試行してください。';
        } else if (err.code === 3) {
          msg = '位置情報の取得がタイムアウトしました。';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, [locations, selectedLocationId, simulationMode]);

  // 拠点変更時またはシミュレーション切り替え時に再測定
  useEffect(() => {
    if (locations.length > 0) {
      measureGps();
    }
  }, [selectedLocationId, simulationMode, measureGps, locations.length]);

  // 作業開始打刻ハンドラ
  const handleCheckin = async () => {
    if (!currentCoords || calculatedDistance === null) {
      alert('先に位置情報を取得してください。');
      return;
    }

    const targetLoc = locations.find((l) => l.id === selectedLocationId);
    if (!targetLoc) return;

    if (!isWithinRadius) {
      alert(
        `活動拠点の許容範囲外です。\n現在地は「${targetLoc.name}」から ${calculatedDistance}m 離れています（許容半径: ${targetLoc.radius_meters}m）。`
      );
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('ユーザー情報が見つかりません');

      const { error } = await (supabase.from('checkins') as any).insert({
        user_id: user.id,
        location_id: targetLoc.id,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        distance_meters: calculatedDistance,
        status: 'working',
        checkin_at: new Date().toISOString(),
      });

      if (error) {
        alert('チェックインに失敗しました: ' + error.message);
      } else {
        setSuccessMessage(`「${targetLoc.name}」にて作業開始を打刻しました！安全に作業してください。`);
        await fetchData();
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 作業終了打刻ハンドラ
  const handleCheckout = async () => {
    if (!activeCheckin) return;
    if (!confirm('本日の作業を終了し、退勤打刻しますか？')) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('checkins') as any)
        .update({
          checkout_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', activeCheckin.id);

      if (error) {
        alert('作業終了打刻に失敗しました: ' + error.message);
      } else {
        setSuccessMessage('作業終了（退勤）を打刻しました。本日の作業お疲れ様でした！');
        await fetchData();
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              GPS位置情報出欠チェックイン
            </h1>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
              KAIT Racing Garage Attendance System
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-300 mt-2">
          ガレージ等の活動拠点に到着後、現場のGPS位置情報を検証して「作業開始」を打刻します。
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-sm flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* GPS Error Notification */}
      {gpsError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-bold mb-1">位置情報の取得エラー</p>
            <p>{gpsError}</p>
            <p className="text-xs text-slate-400 mt-2">
              ※学内ネットワークや屋内でGPSが取得しづらい場合、または開発環境でのテストは、下の「テスト用位置シミュレーター」をONにして動作を確認できます。
            </p>
          </div>
        </div>
      )}

      {/* 作業中ステータスカード (作業中の場合のみ大きく表示) */}
      {activeCheckin && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/60 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>作業中（チェックイン済み）</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {activeCheckin.locations?.name || '活動拠点'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                開始打刻: {formatDate(activeCheckin.checkin_at)} {new Date(activeCheckin.checkin_at).toLocaleTimeString('ja-JP')}
              </p>
            </div>

            {/* Timer Display */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center sm:text-right">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                経過作業時間
              </p>
              <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 tracking-tight">
                {elapsedTime}
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              作業がすべて完了したら、下のボタンを押して作業終了（退勤）を記録してください。
            </p>
            <button
              onClick={handleCheckout}
              disabled={actionLoading}
              className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-base rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 transition disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>記録中...</span>
                </>
              ) : (
                <>
                  <StopCircle className="w-6 h-6" />
                  <span>作業終了（退勤）を打刻する</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 打刻操作パネル（未チェックイン時、または追加打刻用） */}
      {!activeCheckin && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>作業場所の選択</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                現在作業を行う部屋（拠点）を選択してください。
              </p>
            </div>

            {/* 拠点セレクター */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} (半径{loc.radius_meters}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GPS 測定ステータスゲージ */}
          {selectedLoc && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    拠点との位置関係
                  </span>
                </div>
                <button
                  onClick={measureGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>位置情報を再取得</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">対象拠点</span>
                  <span className="text-sm font-bold text-white block truncate">
                    {selectedLoc.name}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">許容半径</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {selectedLoc.radius_meters} m 以内
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">現在地との距離</span>
                  {gpsLoading ? (
                    <span className="text-sm text-slate-400 flex items-center justify-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      測位中...
                    </span>
                  ) : calculatedDistance !== null ? (
                    <span
                      className={`text-base font-black ${
                        isWithinRadius ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {calculatedDistance} m
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">未測定</span>
                  )}
                </div>
              </div>

              {/* 判定バナー */}
              {!gpsLoading && calculatedDistance !== null && (
                <div
                  className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-3 border ${
                    isWithinRadius
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {isWithinRadius ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                      <div>
                        <p className="font-bold">打刻可能な範囲内です！</p>
                        <p className="text-xs text-emerald-400/90 mt-0.5">
                          建物内（{selectedLoc.name}）にいることがGPSにより確認されました。
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                      <div>
                        <p className="font-bold">拠点の許容半径（{selectedLoc.radius_meters}m）の範囲外です</p>
                        <p className="text-xs text-rose-300/90 mt-0.5">
                          現在、拠点から {calculatedDistance}m 離れています。ガレージまたは内燃室に到着してから打刻してください。
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 作業開始打刻ボタン */}
          <div className="pt-2">
            <button
              onClick={handleCheckin}
              disabled={actionLoading || gpsLoading || !isWithinRadius}
              className={`w-full py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition ${
                isWithinRadius
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer scale-100 hover:scale-[1.01]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>打刻処理中...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6" />
                  <span>現場に到着！作業開始を打刻する</span>
                </>
              )}
            </button>
          </div>

          {/* 開発・遠隔検証用 シミュレーションスイッチ */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>テスト用位置シミュレーター（遠隔地からの動作確認用）</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulationMode}
                onChange={(e) => setSimulationMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* 本日の作業打刻履歴 */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <span>本日の打刻履歴・作業実績</span>
        </h2>

        {todayHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 text-sm">
            本日の出欠チェックイン履歴はありません。
          </div>
        ) : (
          <div className="space-y-3">
            {todayHistory.map((item) => {
              const isCurrentWorking = item.status === 'working';
              const startStr = new Date(item.checkin_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endStr = item.checkout_at
                ? new Date(item.checkout_at).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '作業中';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrentWorking
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isCurrentWorking
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCurrentWorking ? (
                        <Radio className="w-4 h-4 animate-pulse" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {item.locations?.name || '活動拠点'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(item.checkin_at)} ｜ {startStr} 〜 {endStr} (実測距離: {item.distance_meters}m)
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold text-center self-start sm:self-auto ${
                      isCurrentWorking
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isCurrentWorking ? '作業中' : '作業完了（退勤済）'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
