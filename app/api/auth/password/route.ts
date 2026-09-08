import { z } from 'zod';
import { fail, ok, parseBody } from '@/server/lib/api';
import { requireActor, hashPassword, verifyPassword } from '@/server/lib/auth';
import { prisma } from '@/server/db/prisma';
import { ConflictError, UnprocessableError } from '@/server/lib/errors';
import { AuditAction, requestMeta, writeAudit } from '@/server/lib/audit';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码').max(200),
    newPassword: z
      .string()
      .min(8, '新密码至少 8 位')
      .max(64, '新密码不能超过 64 位')
      .regex(/[A-Za-z]/, '新密码需包含字母')
      .regex(/\d/, '新密码需包含数字'),
    confirmPassword: z.string().min(1, '请再次输入新密码').max(64),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const input = await parseBody(request, changePasswordSchema);

    // 新密码不能与当前密码相同（先取 hash 再比较）
    const user = await prisma.user.findFirst({
      where: { id: actor.userId, isActive: true, deletedAt: null },
      select: { id: true, username: true, passwordHash: true },
    });
    if (!user) throw new ConflictError('ACCOUNT_NOT_FOUND', '账号不存在或已停用');

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new UnprocessableError('CURRENT_PASSWORD_WRONG', '当前密码不正确');
    }
    if (await verifyPassword(input.newPassword, user.passwordHash)) {
      throw new UnprocessableError('NEW_PASSWORD_SAME', '新密码不能与当前密码相同');
    }

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    const meta = requestMeta(request);
    await writeAudit({
      actorId: user.id,
      action: AuditAction.PASSWORD_CHANGE,
      entity: 'USER',
      entityId: user.id,
      after: { username: user.username },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ changed: true });
  } catch (err) {
    return fail(err);
  }
}
