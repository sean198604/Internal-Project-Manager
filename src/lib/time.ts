import { formatInTimeZone } from 'date-fns-tz';
import { env } from './env';

const TZ = env.APP_TIMEZONE;

/** 时间戳（timestamptz）展示：UTC 存储 → 业务时区展示 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return formatInTimeZone(d, TZ, 'yyyy-MM-dd HH:mm');
}

/** 纯日期（date 类型，无时区）展示：不做时区转换 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return formatInTimeZone(d, 'UTC', 'yyyy-MM-dd');
}

/** 相对天数：正数表示已过去，负数表示还有多少天 */
export function daysFromToday(value: Date | string): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  const today = startOfTodayUtc();
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - target) / 86_400_000);
}

/** 以业务时区计算「今天 00:00」对应的 UTC 时间戳 */
export function startOfTodayUtc(): number {
  const now = new Date();
  const nowLocal = formatInTimeZone(now, TZ, 'yyyy-MM-dd');
  const [y, m, d] = nowLocal.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 两个时间点相差天数（用于长期未更新） */
export function daysSince(value: Date | string): number {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
