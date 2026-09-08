import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { buildScope } from '@/server/lib/authz';
import { startUpload, listDocuments, createDocument } from '@/server/modules/projects/subresources';
import { documentSchema, uploadMetaSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return { items: await listDocuments(actor, id, buildScope(actor)) };
  });
}

export async function POST(request: Request, { params }: Context) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const { id } = await params;
    const body = await request.json();
    if (body?.mode === 'start') {
      const meta = uploadMetaSchema.parse(body);
      return startUpload(actor, id, meta);
    }
    const input = documentSchema.parse({ ...body });
    return createDocument(actor, id, input, requestMeta(request));
  });
}
