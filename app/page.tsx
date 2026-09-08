import { redirect } from 'next/navigation';
import { getActorOrNull } from '@/server/lib/auth';

export default async function Home() {
  const actor = await getActorOrNull();
  redirect(actor ? '/dashboard' : '/login');
}
