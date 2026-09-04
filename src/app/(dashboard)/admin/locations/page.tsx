'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Navigation,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminLocationsPage() {
  const supabase = createClient();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [formError, setFormError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // フォーム状態
  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '50',
    is_active: true,
  });

  // 拠点一覧取得
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('locations') as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching locations:', error);
      } else {
        setLocations((data as unknown as Location[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // モーダルオープン（新規）
  const openCreateModal = () => {
    setForm({
      name: '',
      latitude: '',
      longitude: '',
      radius_meters: '50',
      is_active: true,
    });
    setEditingLocation(null);
    setFormError('');
    setShowModal(true);
  };

  // モーダルオープン（編集）
  const openEditModal = (loc: Location) => {
    setForm({
      name: loc.name,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radius_meters: loc.radius_meters.toString(),
      is_active: loc.is_active,
    });
    setEditingLocation(loc);
    setFormError('');
    setShowModal(true);
  };

  // 現在地GPSを取得してフォームに代入
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報に対応していません');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGettingLocation(false);
      },
      (err) => {
        alert('位置情報の取得に失敗しました: ' + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 保存処理
  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('拠点名を入力してください');
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const radius = parseFloat(form.radius_meters);

    if (isNaN(lat) || isNaN(lng)) {
      setFormError('緯度・経度を正しく入力してください');
      return;
    }
    if (isNaN(radius) || radius <= 0) {
      setFormError('許容半径は1m以上の正の数値を指定してください');
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      radius_meters: radius,
      is_active: form.is_active,
    };

    let error;
    if (editingLocation) {
      ({ error } = await (supabase.from('locations') as any)
        .update(payload)
        .eq('id', editingLocation.id));
    } else {
      ({ error } = await (supabase.from('locations') as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      setFormError('保存に失敗しました: ' + error.message);
    } else {
      setShowModal(false);
      await fetchLocations();
    }
  };

  // 有効/無効トグル
  const handleToggleActive = async (loc: Location) => {
    setActionLoadingId(loc.id);
    try {
      const { error } = await (supabase.from('locations') as any)
        .update({ is_active: !loc.is_active })
        .eq('id', loc.id);

      if (error) {
        alert('状態変更に失敗しました: ' + error.message);
      } else {
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? { ...l, is_active: !l.is_active } : l))
        );
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      const { error } = await (supabase.from('locations') as any)
        .delete()
        .eq('id', deleteTarget.id);

      if (error) {
        alert('削除に失敗しました: ' + error.message);
      } else {
        setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── ヘッダー ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-500" />
            活動拠点・GPS打刻エリア設定
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            部員がGPS打刻できる現場（車両実験実習室、内燃室など）の座標と許容半径を管理します。
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-racing-red hover:bg-racing-red/90 text-white text-xs font-bold transition shadow-lg shadow-racing-red/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          新規拠点を追加
        </button>
      </div>

      {/* ─── 拠点一覧カード ───────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">登録されている拠点がありません</p>
          <p className="text-xs text-slate-500">
            「新規拠点を追加」からガレージや実験室を登録してください
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => {
            const isProcessing = actionLoadingId === loc.id;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;

            return (
              <div
                key={loc.id}
                className={cn(
                  'bg-slate-900 border rounded-2xl p-5 space-y-4 transition shadow-lg relative overflow-hidden',
                  loc.is_active
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/60 opacity-60'
                )}
              >
                {/* 状態バー */}
                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1',
                    loc.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                  )}
                />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{loc.name}</h3>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          loc.is_active
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        )}
                      >
                        {loc.is_active ? '稼働中' : '停止中'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      打刻許容半径:{' '}
                      <strong className="text-emerald-400 font-mono text-sm">
                        {loc.radius_meters}m
                      </strong>
                    </p>
                  </div>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-400 border border-slate-700 transition"
                    title="Googleマップで位置を確認"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* 座標情報 */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>緯度 (Latitude):</span>
                    <span className="text-white font-semibold">{loc.latitude}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>経度 (Longitude):</span>
                    <span className="text-white font-semibold">{loc.longitude}</span>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => handleToggleActive(loc)}
                    disabled={isProcessing}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    {loc.is_active ? '無効化する' : '有効化する'}
                  </button>
                  <button
                    onClick={() => openEditModal(loc)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="編集"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(loc)}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 新規追加・編集モーダル ─────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                {editingLocation ? '拠点を編集' : '新規拠点を追加'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  拠点名称 <span className="text-racing-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: 車両実験実習室 (E6号館 V棟)"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
                />
              </div>

              {/* 現在地取得ボタン */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                >
                  <Navigation className={cn('w-3.5 h-3.5 text-sky-400', gettingLocation && 'animate-spin')} />
                  <span>現在地のGPS座標を自動入力</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    緯度 (Latitude) <span className="text-racing-red">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="35.4878321"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    経度 (Longitude) <span className="text-racing-red">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="139.3430929"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  許容半径 (m) <span className="text-racing-red">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.radius_meters}
                  onChange={(e) => setForm((f) => ({ ...f, radius_meters: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  ※ V棟は50m、内燃室は30mが推奨設定です
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-950 text-racing-red focus:ring-0"
                />
                <label htmlFor="loc_is_active" className="text-xs text-slate-300 cursor-pointer">
                  この拠点を有効（打刻可能）にする
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-racing-red hover:bg-racing-red/90 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingLocation ? '変更を保存' : '拠点を作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 削除確認モーダル ──────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-slate-900 border border-red-800/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">拠点を削除</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              拠点「<span className="font-bold text-white">{deleteTarget.name}</span>」を削除しますか？
              <br />
              <span className="text-slate-400 text-[11px] mt-1 block">
                過去の打刻ログとの関連付けに影響する場合があります。利用を停止したいだけの場合は「無効化」を推奨します。
              </span>
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoadingId === deleteTarget.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {actionLoadingId === deleteTarget.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
