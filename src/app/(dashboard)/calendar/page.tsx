import { Calendar as CalendarIcon, Info } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-sky-950/40 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            全体カレンダー
          </h1>
        </div>
        <p className="text-sm text-slate-300 mt-2">
          大会、試走会、学内試走、全体ミーティング、デザイン審査締切等の統合スケジュール管理。
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>
          現在は土台（認証機能）セットアップ完了状態です。全体イベントと個人シフトが統合表示されるカレンダーUIを順次実装します。
        </p>
      </div>
    </div>
  );
}
