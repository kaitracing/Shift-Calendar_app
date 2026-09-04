import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KAIT Racing - 作業シフト・出欠管理',
  description: '学生フォーミュラチーム KAIT Racing 作業シフト希望提出・現場GPS出欠打刻・全体カレンダー管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
