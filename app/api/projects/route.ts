import { handle, handleCreated, parseBody, parseQuery } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import * as projectService from '@/server/modules/projects/service';
import { createProjectSchema, listProjectsSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor();
    const params = parseQuery(request, listProjectsSchema);
    return projectService.list(actor, params);
  });
}

export async function POST(request: Request) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const input = await parseBody(request, createProjectSchema);
    return projectService.create(actor, input, requestMeta(request));
  });
}
