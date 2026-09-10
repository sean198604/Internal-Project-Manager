import { redirect } from 'next/navigation';
import { Archive } from 'lucide-react';
import { getActorOrNull } from '@/server/lib/auth';
import { LoginForm } from '@/features/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const actor = await getActorOrNull();
  if (actor) redirect('/dashboard');

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
      style={{
        background:
          'radial-gradient(900px 480px at 85% -10%, rgba(219,234,254,0.9) 0%, rgba(219,234,254,0) 62%), radial-gradient(820px 420px at -8% 108%, rgba(237,233,254,0.85) 0%, rgba(237,233,254,0) 58%), #f5f7fb',
      }}
    >
      <div className="relative w-[400px] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 pb-7 pt-8 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.22)] sm:px-10 sm:pb-8 sm:pt-10">
        {/* 顶部渐变条 */}
        <div
          className="absolute left-0 right-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg, #1a365d 0%, #378ADD 55%, #7c3aed 100%)',
          }}
        />

        {/* Logo */}
        <div className="mx-auto mb-3.5 flex h-[54px] w-[54px] items-center justify-center rounded-[15px] bg-gradient-to-br from-[#2c5aa0] to-[#1a365d] text-white shadow-[0_8px_20px_-6px_rgba(26,54,93,0.5)]">
          <Archive size={26} />
        </div>

        {/* 标题 */}
        <h1 className="text-center text-[21px] font-bold tracking-tight text-[#1a365d]">
          项目管理中心
        </h1>
        <p className="mb-6 mt-1 text-center text-[12.5px] text-slate-500">
          项目生命周期 · 软件资产知识中心
        </p>

        {/* 表单 */}
        <LoginForm />

        {/* 隐私说明 */}
        <p className="mt-5 text-center text-[11px] leading-[1.7] text-slate-400">
          项目数据属内部资产，仅限授权人员访问。
          <br />
          账号由管理员分配，如有疑问请联系系统管理员。
        </p>
      </div>
    </main>
  );
}
