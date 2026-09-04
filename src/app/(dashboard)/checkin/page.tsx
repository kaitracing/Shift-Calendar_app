import { MapPin, Info } from 'lucide-react';

export default function CheckinPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <MapPin className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            GPS位置情報チェックイン
          </h1>
        </div>
        <p className="text-sm text-slate-300 mt-2">
          活動拠点（ガレージ・部室）に到着後、「作業開始」ボタンを押して出欠打刻を行います。
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>
          現在は土台（認証機能）セットアップ完了状態です。次のフェーズでブラウザ位置情報（navigator.geolocation）と拠点距離（150m以内）判定機能が有効化されます。
        </p>
      </div>
    </div>
  );
}
