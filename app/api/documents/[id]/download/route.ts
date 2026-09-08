import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { downloadDocument } from '@/server/modules/projects/subresources';
import { createReadStream, statSync } from 'node:fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    const file = await downloadDocument(actor, id);
    const stat = statSync(file.filePath);
    const stream = createReadStream(file.filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': file.mimeType ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      },
    });
  } catch (err) {
    const { fail } = await import('@/server/lib/api');
    return fail(err);
  }
}
