export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) {
    super('VALIDATION_ERROR', 400, '请求参数校验失败', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('UNAUTHORIZED', 401, '未登录或会话已失效');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 401, '用户名或密码错误');
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 403, '没有执行该操作的权限');
  }
}

/** 越权与不存在统一使用 404，避免泄露资源是否存在 */
export class NotFoundError extends AppError {
  constructor(entity = 'RESOURCE') {
    super(`${entity}_NOT_FOUND`, 404, '资源不存在');
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = '操作与当前数据状态冲突', details?: unknown) {
    super(code, 409, message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, 422, message, details);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('RATE_LIMITED', 429, '操作过于频繁，请稍后再试');
  }
}

/**
 * 统一把异常转成 API 响应。
 * 生产环境不泄露内部错误细节，仅返回 traceId 供日志关联。
 */
export function toErrorResponse(err: unknown, isProduction: boolean) {
  const traceId = crypto.randomUUID();

  if (err instanceof AppError) {
    const message = isProduction && err.status >= 500 ? '操作失败，请稍后重试' : err.message;
    return {
      status: err.status,
      body: { error: { code: err.code, message, traceId, details: isProduction ? undefined : err.details } },
    };
  }

  console.error(`[${traceId}] Unhandled error:`, err);

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: '操作失败，请稍后重试',
        traceId,
        details: isProduction ? undefined : String(err),
      },
    },
  };
}
