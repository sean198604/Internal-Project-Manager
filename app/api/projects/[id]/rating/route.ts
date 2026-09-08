import { z } from 'zod';
import { handle, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { rateProject } from '@/server/modules/projects/service';

export const dynamic = 'force-dynamic';

const rateSchema = z.object({
  rating: z.number().int().min(0).max(5, '星级为 0-5'),
});

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(request, rateSchema);
    return rateProject(actor, id, input.rating, requestMeta(request));
  });
}
