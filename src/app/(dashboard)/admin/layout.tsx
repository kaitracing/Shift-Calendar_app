import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminNavTabs from '@/components/admin/AdminNavTabs';
import { Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileData } = await (supabase.from('profiles') as any)
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const profile = profileData as unknown as {
    role: 'admin' | 'manager' | 'member';
    full_name: string;
  } | null;

  const isManagerOrAdmin =
    profile?.role === 'admin' || profile?.role === 'manager';

  if (!isManagerOrAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-900 border border-red-900/40 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">アクセス権限がありません</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          このセクションは KAIT Racing のリーダー（Manager）または最高管理者（Admin）のみアクセス可能です。
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          ホームへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 管理者トップバー ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-900/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">チーム運営管理パネル</h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {profile.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              リアルタイム作業員状況、シフト調整、部員名簿・権限、活動拠点GPSの集中管理
            </p>
          </div>
        </div>
      </div>

      {/* ─── 管理タブ切り替え ───────────────────────────────────── */}
      <AdminNavTabs />

      {/* ─── 各管理画面コンテンツ ───────────────────────────────── */}
      <div>{children}</div>
    </div>
  );
}
