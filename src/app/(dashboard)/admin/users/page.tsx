'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Department,
  DEPARTMENT_LABELS,
  UserRole,
  ROLE_LABELS,
} from '@/types/database.types';
import {
  Users,
  Shield,
  Search,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Mail,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  student_id: string | null;
  department: Department;
  sub_departments: Department[];
  role: UserRole;
  is_banned: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 権限変更モーダル
  const [roleModalUser, setRoleModalUser] = useState<UserProfile | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('member');

  // BAN切り替え確認モーダル
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);

  // ログイン中ユーザー取得
  useEffect(() => {
    const fetchCurrent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase.from('profiles') as any)
        .select('id, role')
        .eq('id', user.id)
        .single();
      if (data) {
        setCurrentUser(data as { id: string; role: UserRole });
      }
    };
    fetchCurrent();
  }, [supabase]);

  // 部員一覧取得
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('profiles') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers((data as unknown as UserProfile[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 権限変更実行
  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    if (roleModalUser.id === currentUser?.id && selectedNewRole !== 'admin') {
      if (!confirm('自分自身の管理者権限を降格させようとしています。よろしいですか？')) {
        return;
      }
    }

    setActionLoadingId(roleModalUser.id);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ role: selectedNewRole })
        .eq('id', roleModalUser.id);

      if (error) {
        alert('権限変更に失敗しました: ' + error.message);
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === roleModalUser.id ? { ...u, role: selectedNewRole } : u
          )
        );
        setRoleModalUser(null);
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // BAN / BAN解除実行
  const handleToggleBan = async () => {
    if (!banModalUser) return;
    if (banModalUser.id === currentUser?.id) {
      alert('自分自身のアカウントをBANすることはできません。');
      setBanModalUser(null);
      return;
    }

    const nextBanStatus = !banModalUser.is_banned;
    setActionLoadingId(banModalUser.id);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ is_banned: nextBanStatus })
        .eq('id', banModalUser.id);

      if (error) {
        alert('アカウントステータス変更に失敗しました: ' + error.message);
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === banModalUser.id ? { ...u, is_banned: nextBanStatus } : u
          )
        );
        setBanModalUser(null);
      }
    } catch (err: any) {
      alert('エラー: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // フィルタリング
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedDept !== 'all' && u.department !== selectedDept) {
        return false;
      }
      if (selectedRole !== 'all' && u.role !== selectedRole) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = u.full_name?.toLowerCase().includes(q);
        const idMatch = u.student_id?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        return nameMatch || idMatch || emailMatch;
      }
      return true;
    });
  }, [users, selectedDept, selectedRole, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ─── 検索 & フィルターバー ───────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="部員氏名・学籍番号・メールアドレス検索"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 班フィルター */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">すべての班</option>
            {Object.entries(DEPARTMENT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {/* 権限フィルター */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">すべての権限</option>
            <option value="admin">最高管理者 (Admin)</option>
            <option value="manager">リーダー/幹部 (Manager)</option>
            <option value="member">一般部員 (Member)</option>
          </select>
        </div>
      </div>

      {/* ─── 部員一覧テーブル ───────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">部員が見つかりません</p>
          <p className="text-xs text-slate-500">条件を変更して再度検索してください</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="py-3 px-4 font-semibold">部員氏名 / 学籍番号</th>
                  <th className="py-3 px-4 font-semibold">メイン班 / 兼任班</th>
                  <th className="py-3 px-4 font-semibold">権限ロール</th>
                  <th className="py-3 px-4 font-semibold">状態</th>
                  <th className="py-3 px-4 font-semibold">登録日</th>
                  <th className="py-3 px-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  const isProcessing = actionLoadingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'hover:bg-slate-800/40 transition',
                        user.is_banned && 'bg-red-950/20 opacity-75'
                      )}
                    >
                      {/* 氏名 / 学籍番号 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {user.full_name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                              あなた
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {user.student_id ? (
                            <span className="font-mono">学籍: {user.student_id}</span>
                          ) : (
                            <span className="text-slate-500">学籍番号未設定</span>
                          )}
                          {user.email && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{user.email}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 班 */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {DEPARTMENT_LABELS[user.department] ?? user.department}
                        </div>
                        {user.sub_departments && user.sub_departments.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            兼: {user.sub_departments.map((d) => DEPARTMENT_LABELS[d]).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* 権限 */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase',
                            user.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : user.role === 'manager'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          )}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* BAN状態 */}
                      <td className="py-3 px-4">
                        {user.is_banned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            <UserX className="w-3 h-3" />
                            BAN中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            有効
                          </span>
                        )}
                      </td>

                      {/* 登録日 */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {user.created_at?.slice(0, 10)}
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* 権限変更ボタン */}
                          <button
                            onClick={() => {
                              setRoleModalUser(user);
                              setSelectedNewRole(user.role);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            title="権限の変更"
                          >
                            権限変更
                          </button>

                          {/* BAN / BAN解除ボタン */}
                          {!isCurrent && (
                            <button
                              onClick={() => setBanModalUser(user)}
                              disabled={isProcessing}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-semibold transition border',
                                user.is_banned
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60'
                                  : 'bg-red-950/40 text-red-300 border-red-800/40 hover:bg-red-900/60'
                              )}
                            >
                              {user.is_banned ? 'BAN解除' : 'BAN'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 権限変更モーダル ──────────────────────────────────────── */}
      {roleModalUser && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setRoleModalUser(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">権限ロール変更</h3>
                <p className="text-xs text-slate-400">{roleModalUser.full_name} さん</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                変更後のロールを選択
              </label>
              {(['member', 'manager', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedNewRole(r)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition text-left',
                    selectedNewRole === r
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <span>{ROLE_LABELS[r]}</span>
                  {selectedNewRole === r && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRoleModalUser(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={actionLoadingId === roleModalUser.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {actionLoadingId === roleModalUser.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BAN確認モーダル ──────────────────────────────────────── */}
      {banModalUser && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setBanModalUser(null)}
        >
          <div
            className="bg-slate-900 border border-red-800/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {banModalUser.is_banned ? 'BAN解除の確認' : 'アカウントBANの確認'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">{banModalUser.full_name}</span>
              （学籍: {banModalUser.student_id ?? 'なし'}）さんを
              {banModalUser.is_banned ? 'BAN解除して利用を許可' : 'BANしてログイン不可'}
              にしますか？
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBanModalUser(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleToggleBan}
                disabled={actionLoadingId === banModalUser.id}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50',
                  banModalUser.is_banned
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                )}
              >
                {actionLoadingId === banModalUser.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {banModalUser.is_banned ? '解除する' : 'BANする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
