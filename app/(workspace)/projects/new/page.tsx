import { redirect } from 'next/navigation';
import { ProjectEditor } from '@/features/projects/project-editor';
import { getActorOrNull } from '@/server/lib/auth';
import { listDepartments, listProjectTypes, listActiveUsers } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');

  const [departments, projectTypes, users] = await Promise.all([
    listDepartments(),
    listProjectTypes(),
    listActiveUsers(),
  ]);

  return (
    <ProjectEditor
      mode="create"
      me={{ id: actor.userId, displayName: actor.displayName }}
      departments={departments}
      projectTypes={projectTypes}
      users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
    />
  );
}
