import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { getArchiveState, toggleChecklistItem } from '@/server/modules/projects/subresources';
import { checklistToggleSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return getArchiveState(actor, id);
  });
}

export async function POST(request: Request, { params }: Context) {
  // POST 用于切换 checklist 项
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, checklistToggleSchema);
    return toggleChecklistItem(actor, id, input);
  });
}
