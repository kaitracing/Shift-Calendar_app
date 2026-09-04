'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Department, DEPARTMENT_LABELS } from '@/types/database.types';
import { Flag, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [mainDepartment, setMainDepartment] = useState<Department>('mechanical');
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggleSubDepartment = (dept: Department) => {
    if (subDepartments.includes(dept)) {
      setSubDepartments(subDepartments.filter((d) => d !== dept));
    } else {
      setSubDepartments([...subDepartments, dept]);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('パスワードと確認用パスワードが一致しません。');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('パスワードは6文字以上で設定してください。');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      // メイン班と重複するサブ班は除外
      const filteredSubs = subDepartments.filter((d) => d !== mainDepartment);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            student_id: studentId.trim() || null,
            department: mainDepartment,
            sub_departments: filteredSubs,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // サインアップ後の処理
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setSuccessMsg(
          '登録確認メールを送信しました。メール内の確認リンクをクリックして本登録を完了してください。'
        );
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg('登録処理中にエラーが発生しました。');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-lg mb-2">
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
            新規部員アカウント登録
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              氏名 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="例: 工科 太郎"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              学籍番号 <span className="text-slate-500 font-normal">（任意）</span>
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="例: 22M1001"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              メイン所属班 <span className="text-rose-400">*</span>
            </label>
            <select
              value={mainDepartment}
              onChange={(e) => {
                const newMain = e.target.value as Department;
                setMainDepartment(newMain);
                // サブ班から新しいメイン班を除外
                setSubDepartments(subDepartments.filter((d) => d !== newMain));
              }}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            >
              {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((dept) => (
                <option key={dept} value={dept}>
                  {DEPARTMENT_LABELS[dept]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                兼班・サブ所属班 <span className="text-slate-500 font-normal">（兼任している場合・複数可）</span>
              </label>
              {subDepartments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubDepartments([])}
                  className="text-[11px] text-slate-400 hover:text-rose-400"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl">
              {(Object.keys(DEPARTMENT_LABELS) as Department[])
                .filter((dept) => dept !== mainDepartment)
                .map((dept) => {
                  const isChecked = subDepartments.includes(dept);
                  return (
                    <label
                      key={dept}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition border ${
                        isChecked
                          ? 'bg-rose-950/40 border-rose-500/50 text-white font-medium'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSubDepartment(dept)}
                        className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900 w-3.5 h-3.5"
                      />
                      <span>{DEPARTMENT_LABELS[dept]}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              メールアドレス <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@kait-racing.jp"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              パスワード (6文字以上) <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              パスワード（確認） <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>登録中...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>部員アカウント作成</span>
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <p className="text-sm text-slate-400">
            既にアカウントをお持ちですか？{' '}
            <Link
              href="/login"
              className="text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-4"
            >
              ログインはこちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
