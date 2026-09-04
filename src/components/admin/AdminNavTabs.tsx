'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, CalendarCheck, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminNavTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'リアルタイム作業者',
      href: '/admin/realtime',
      icon: Radio,
      badge: 'LIVE',
    },
    {
      label: 'シフト調整・タスク割当',
      href: '/admin/shifts',
      icon: CalendarCheck,
    },
    {
      label: '部員・権限管理',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: '拠点GPS設定',
      href: '/admin/locations',
      icon: MapPin,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border',
              isActive
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive ? 'text-amber-400' : 'text-slate-400')} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] font-black px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full animate-pulse">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
