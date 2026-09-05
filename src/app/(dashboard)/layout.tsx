import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';

export default async function DashboardLayout({
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

  // プロフィール取得
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, student_id, department, sub_departments, role, is_banned')
    .eq('id', user.id)
    .single();

  const profile = profileData as {
    full_name: string;
    student_id: string | null;
    department: any;
    sub_departments?: any[];
    role: any;
    is_banned: boolean;
  } | null;

  // BANアカウントはアクセス遮断
  if (profile?.is_banned) {
    await supabase.auth.signOut();
    redirect('/login?error=banned');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        user={{ id: user.id, email: user.email }}
        profile={profile}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>&copy; {new Date().getFullYear()} KAIT Racing (Kanagawa Institute of Technology Formula EV Project). All rights reserved.</p>
        <p>Developer: Yulu3_Gemini 3.8 Flash</p>
        <p>ver1.0.0 (2026/09/05)</p>
      </footer>
    </div>
  );
}
