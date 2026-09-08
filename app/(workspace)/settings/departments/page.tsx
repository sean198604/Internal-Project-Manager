import { notFound, redirect } from 'next/navigation';
import { getActorOrNull } from '@/server/lib/auth';
import { DepartmentsView } from '@/features/settings/departments-view';

export const dynamic = 'force-dynamic';

export default async function SettingsDepartmentsPage() {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');
  if (actor.role !== 'ADMIN') notFound();
  return <DepartmentsView />;
}
