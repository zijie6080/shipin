import "server-only";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// 服务端限次：按标识（默认 IP，取不到 IP 时退回设备指纹）在 KV/Redis 里计数。
// 未配置 KV 时整体降级为「不限制」，交回前端 localStorage 软限制兜底。
// ---------------------------------------------------------------------------

// 每个标识在一个时间窗内的免费次数上限（可用环境变量覆盖）
export const SERVER_FREE_LIMIT = Number(process.env.RATE_LIMIT_MAX ?? 5);
// 计数窗口（秒），默认 24 小时后自动恢复。设 0 表示永不过期
const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 86400);

const KEY_PREFIX = "gen_ratelimit:";

export interface Usage {
  used: number;
  limit: number;
  remaining: number;
  enabled: boolean; // false 表示未配置 KV，限次未生效
}

// 惰性构造 Redis 客户端，兼容 Vercel KV 与 Upstash 两套环境变量命名
let cached: Redis | null | undefined;
function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

/**
 * 从请求头取限次标识：优先真实 IP（Vercel 会带 x-forwarded-for），
 * 取不到 IP 时退回设备指纹，都没有则归为 unknown。
 */
export function clientIdentifier(req: Request, deviceId?: string): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    (xff ? xff.split(",")[0].trim() : req.headers.get("x-real-ip")) || "";
  if (ip) return `ip:${ip}`;
  if (deviceId) return `dev:${deviceId}`;
  return "unknown";
}

const disabled = (): Usage => ({
  used: 0,
  limit: SERVER_FREE_LIMIT,
  remaining: SERVER_FREE_LIMIT,
  enabled: false,
});

function toUsage(used: number): Usage {
  const clampedUsed = Math.min(used, SERVER_FREE_LIMIT);
  return {
    used: clampedUsed,
    limit: SERVER_FREE_LIMIT,
    remaining: Math.max(0, SERVER_FREE_LIMIT - used),
    enabled: true,
  };
}

/**
 * 只读当前用量，不增加计数（用于初始展示）。
 */
export async function peekUsage(id: string): Promise<Usage> {
  const redis = getRedis();
  if (!redis) return disabled();
  try {
    const used = (await redis.get<number>(KEY_PREFIX + id)) ?? 0;
    return toUsage(used);
  } catch (err) {
    console.error("[ratelimit] peek 失败，降级为不限制:", err);
    return disabled();
  }
}

/**
 * 计数 +1 并返回最新用量。首次计数时设置过期窗口。
 */
export async function consumeUsage(id: string): Promise<Usage> {
  const redis = getRedis();
  if (!redis) return disabled();
  try {
    const key = KEY_PREFIX + id;
    const used = await redis.incr(key);
    if (used === 1 && WINDOW_SECONDS > 0) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return toUsage(used);
  } catch (err) {
    console.error("[ratelimit] consume 失败，降级为不限制:", err);
    return disabled();
  }
}
