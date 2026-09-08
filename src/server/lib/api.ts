import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IS_PRODUCTION } from '@/lib/env';
import { ValidationError, toErrorResponse } from './errors';

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(err: unknown) {
  const { status, body } = toErrorResponse(err, IS_PRODUCTION);
  return NextResponse.json(body, { status });
}

/** 包裹 Route Handler，统一异常处理 */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err);
  }
}

export async function handleCreated<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return created(await fn());
  } catch (err) {
    return fail(err);
  }
}

/** 请求体 zod 校验 */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError('请求体不是合法 JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten());
  }
  return parsed.data;
}

/** 查询参数 zod 校验 */
export function parseQuery<S extends z.ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten());
  }
  return parsed.data;
}
