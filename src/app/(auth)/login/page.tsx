'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Flag, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(
          error.message === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません。'
            : error.message
        );
        setLoading(false);
        return;
      }

      // BANチェック
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', data.user.id)
          .single();

        const userProfile = profile as { is_banned: boolean } | null;
        if (userProfile?.is_banned) {
          await supabase.auth.signOut();
          setErrorMsg('このアカウントは管理者により無効化（BAN）されています。代表または幹部にお問い合わせください。');
          setLoading(false);
          return;
        }
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg('ログイン処理中にエラーが発生しました。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-lg mb-3">
            <img
              src="/logo.jpg"
              alt="KAIT Racing Logo"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">
            KAIT Racing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            作業シフト・GPS出欠管理システム
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@kait-racing.jp"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>ログイン中...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>ログイン</span>
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <p className="text-sm text-slate-400">
            アカウントをお持ちでないですか？{' '}
            <Link
              href="/register"
              className="text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-4"
            >
              新規部員登録はこちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
