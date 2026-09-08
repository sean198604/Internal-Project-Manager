import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: '项目管理中心',
  description: 'Internal-Project-Manager · 项目生命周期与软件资产知识中心',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-fg antialiased">
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
