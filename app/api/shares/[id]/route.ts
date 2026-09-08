import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { requestMeta } from '@/server/lib/audit';
import { getShare, revokeShare } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** 分享链接详情（含其中项目的安全摘要） */
export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return getShare(actor, id);
  });
}

/** 撤销分享链接（仅创建者可撤销） */
export async function DELETE(request: Request, { params }: Context) {
  return handle(async () => {
    const actor = await requireActor();
    const { id } = await params;
    return revokeShare(actor, id, requestMeta(request));
  });
}
