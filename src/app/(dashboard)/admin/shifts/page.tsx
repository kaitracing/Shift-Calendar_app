import { Shield, Users, Info } from 'lucide-react';

export default function AdminShiftsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/40 border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            シフト調整・人手モニタリング（管理者専用）
          </h1>
        </div>
        <p className="text-sm text-slate-300 mt-2">
          日別・時間帯別・班別の提出シフト一覧の確認、作業タスクの割り当て、シフト確定を行います。
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>管理者機能はManagerおよびAdmin権限のユーザーのみ利用可能です。</p>
      </div>
    </div>
  );
}
