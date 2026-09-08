import { notFound, redirect } from 'next/navigation';
import { getActorOrNull } from '@/server/lib/auth';
import { ProjectTypesView } from '@/features/settings/project-types-view';

export const dynamic = 'force-dynamic';

export default async function SettingsProjectTypesPage() {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');
  if (actor.role !== 'ADMIN') notFound();
  return <ProjectTypesView />;
}
