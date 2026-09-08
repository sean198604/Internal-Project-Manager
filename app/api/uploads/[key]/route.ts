import { handle, handleCreated } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { getActorOrNull } from '@/server/lib/auth';
import { storeUpload } from '@/server/modules/projects/subresources';
import { isAdminOrMaster } from '@/server/lib/authz';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ key: string }> };

/**
 * 客户端拿到 startUpload 返回的 uploadUrl 后，PUT 文件到这里。
 * 注：只接受 ADMIN / MASTER 写入；匿名 PUT 一律 401。
 */
export async function PUT(request: Request, { params }: Context) {
  return handleCreated(async () => {
    const actor = await getActorOrNull();
    if (!actor) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (!isAdminOrMaster(actor)) {
      return new Response('Forbidden', { status: 403 });
    }
    const { key } = await params;
    const storageKey = decodeURIComponent(key);
    const buf = Buffer.from(await request.arrayBuffer());
    await storeUpload(actor, storageKey, buf);
    return { storageKey, size: buf.length };
  });
}
