import { Shield, Radio, Info } from 'lucide-react';

export default function AdminRealtimePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/40 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            リアルタイム作業者モニター（管理者専用）
          </h1>
        </div>
        <p className="text-sm text-slate-300 mt-2">
          現在ガレージ等の拠点にGPSチェックインしている作業メンバーの一覧をリアルタイム表示します。
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>Supabase Realtime と連携したリアルタイム打刻同期モニター画面です。</p>
      </div>
    </div>
  );
}
