import { redirect } from 'next/navigation';
import { getActorOrNull } from '@/server/lib/auth';
import { ShareManager } from '@/features/shares/share-manager';

export const dynamic = 'force-dynamic';

export default async function SharesPage({
  searchParams,
}: {
  searchParams: Promise<{ preselect?: string }>;
}) {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');

  const params = await searchParams;
  return <ShareManager preselect={params.preselect ?? null} />;
}
