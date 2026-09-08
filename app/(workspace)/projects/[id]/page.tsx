import { notFound, redirect } from 'next/navigation';
import { ProjectDetailView } from '@/features/projects/project-detail-view';
import { getActorOrNull } from '@/server/lib/auth';
import { isAdminOrMaster } from '@/server/lib/authz';
import {
  listDepartments,
  listProjectTypes,
  listActiveUsers,
} from '@/server/modules/projects/subresources';
import { list } from '@/server/modules/projects/service';
import { detail as getProjectDetail } from '@/server/modules/projects/service';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActorOrNull();
  if (!actor) redirect('/login');
  const { id } = await params;

  const [project, departments, projectTypes, users] = await Promise.all([
    getProjectDetail(actor, id).catch((err) => {
      if (err?.status === 404 || err?.code?.includes('NOT_FOUND')) return null;
      throw err;
    }),
    listDepartments(),
    listProjectTypes(),
    listActiveUsers(),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailView
      me={{ id: actor.userId, role: actor.role, displayName: actor.displayName }}
      isPrivileged={isAdminOrMaster(actor)}
      project={project}
      departments={departments}
      projectTypes={projectTypes}
      users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
    />
  );
}
