'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole, Department, DEPARTMENT_LABELS } from '@/types/database.types';
import {
  Flag,
  Calendar,
  Clock,
  MapPin,
  Shield,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    full_name: string;
    student_id: string | null;
    department: Department;
    role: UserRole;
  } | null;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'ホーム', href: '/', icon: Flag },
    { label: 'シフト提出', href: '/shifts', icon: Clock },
    { label: 'GPS打刻', href: '/checkin', icon: MapPin },
    { label: 'カレンダー', href: '/calendar', icon: Calendar },
  ];

  const isManagerOrAdmin =
    profile?.role === 'admin' || profile?.role === 'manager';

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-xs font-black tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md">
            ADMIN
          </span>
        );
      case 'manager':
        return (
          <span className="px-2 py-0.5 text-xs font-bold tracking-wide bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-md">
            MANAGER
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium tracking-wide bg-slate-700 text-slate-300 rounded-md">
            MEMBER
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 group-hover:scale-105 transition">
                <Flag className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-black tracking-wider text-white">
                  KAIT Racing
                </span>
                <span className="text-xs text-rose-400 block font-medium">
                  Formula Shift App
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isManagerOrAdmin && (
                <Link
                  href="/admin/shifts"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-600/10'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>管理機能</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden sm:flex flex-col items-end text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {profile.full_name}
                  </span>
                  {getRoleBadge(profile.role)}
                </div>
                <span className="text-xs text-slate-400">
                  {DEPARTMENT_LABELS[profile.department]}
                  {profile.student_id ? ` (${profile.student_id})` : ''}
                </span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              title="ログアウト"
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
                  isActive ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isManagerOrAdmin && (
            <Link
              href="/admin/shifts"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-semibold ${
                pathname.startsWith('/admin')
                  ? 'text-amber-400'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>管理</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
