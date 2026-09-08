import { handle } from '@/server/lib/api';
import { resolveShareToken } from '@/server/modules/projects/subresources';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { token } = await params;
    return resolveShareToken(token);
  });
}
