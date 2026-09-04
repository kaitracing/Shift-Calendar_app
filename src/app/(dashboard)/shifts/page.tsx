import { Clock, Plus, Info } from 'lucide-react';

export default function ShiftsPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-rose-950/40 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            作業シフト希望提出
          </h1>
        </div>
        <p className="text-sm sm:text-base font-bold text-rose-400 mt-2">
          「この日のこの時間帯なら実作業をしに行ける」
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          授業の空きコマや放課後の作業可能時間を選択して提出してください。各班リーダー（Manager）が確認し、具体的な作業タスクを割り当てます。
        </p>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>
          現在は土台（認証機能）セットアップ完了状態です。次のフェーズでシフト希望カレンダー・時間選択フォーム・班別モニタリング機能が有効化されます。
        </p>
      </div>
    </div>
  );
}
