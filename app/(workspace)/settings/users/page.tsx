import { notFound, redirect } from 'next/navigation';
import { getActorOrNull } from '@/server/lib/auth';
import { UsersView } from '@/features/settings/users-view';

export const dynamic = 'force-dynamic';

export default async function SettingsUsersPage() {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');
  if (actor.role !== 'ADMIN') notFound();
  return <UsersView meId={actor.userId} />;
}
