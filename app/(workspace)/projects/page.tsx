import { redirect } from 'next/navigation';
import { ProjectsListView } from '@/features/projects/projects-list-view';
import { getActorOrNull } from '@/server/lib/auth';
import { listDepartments, listProjectTypes, listActiveUsers } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');

  const [departments, projectTypes, users] = await Promise.all([
    listDepartments(),
    listProjectTypes(),
    listActiveUsers(),
  ]);

  return (
    <ProjectsListView
      departments={departments}
      projectTypes={projectTypes}
      users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
    />
  );
}
