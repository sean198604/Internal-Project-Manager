import { z } from 'zod';
import { fail, ok, parseBody } from '@/server/lib/api';
import { prisma } from '@/server/db/prisma';
import { signSession, setSessionCookie, verifyPassword } from '@/server/lib/auth';
import { InvalidCredentialsError, RateLimitError } from '@/server/lib/errors';
import { AuditAction, requestMeta, writeAudit } from '@/server/lib/audit';
import { checkRateLimit, resetRateLimit } from '@/server/lib/rate-limit';

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名').max(64),
  password: z.string().min(1, '请输入密码').max(200),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await parseBody(request, loginSchema);

    const { ip } = requestMeta(request);
    const rateKey = `login:${ip ?? 'unknown'}:${username}`;
    if (!checkRateLimit(rateKey, 5, 15 * 60 * 1000)) {
      throw new RateLimitError();
    }

    const user = await prisma.user.findFirst({
      where: { username, isActive: true, deletedAt: null },
      select: { id: true, username: true, passwordHash: true, role: true },
    });

    // 统一错误文案，不区分「用户不存在」与「密码错误」
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    resetRateLimit(rateKey);

    const token = await signSession({ userId: user.id, role: user.role });
    await setSessionCookie(token);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const meta = requestMeta(request);
    await writeAudit({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entity: 'USER',
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    return fail(err);
  }
}
