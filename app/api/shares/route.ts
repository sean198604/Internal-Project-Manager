import { handle, handleCreated, parseBody } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { listShares, createShare } from '@/server/modules/projects/subresources';
import { createShareSchema } from '@/server/modules/projects/schema';

export const dynamic = 'force-dynamic';

/** 我创建的分享链接列表 */
export async function GET() {
  return handle(async () => {
    const actor = await requireActor();
    return { items: await listShares(actor) };
  });
}

/** 新建分享链接：勾选多个项目 → 生成一个链接 */
export async function POST(request: Request) {
  return handleCreated(async () => {
    const actor = await requireActor();
    const input = await parseBody(request, createShareSchema);
    return createShare(actor, input, requestMeta(request));
  });
}
