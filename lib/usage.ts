// 匿名设备限次：仅用前端 localStorage，防普通用户反复刷新白嫖。
// 不追求绝对防刷（清缓存/无痕/换浏览器仍可绕过），真正防刷需服务端。

const DEVICE_KEY = "device_id";
const USAGE_PREFIX = "free_usage_";

// 免费生成次数上限
export const FREE_LIMIT = 5;

function safeUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 兜底：时间戳 + 随机数
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * 读取（或首次生成）设备唯一 ID，存于 localStorage。
 * 普通刷新不会改变；清除浏览器数据才会重置。
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = safeUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // localStorage 不可用（隐私模式等）时退化为空 ID
    return "";
  }
}

// 次数记录与 device_id 绑定
function usageKey(deviceId: string): string {
  return `${USAGE_PREFIX}${deviceId}`;
}

/**
 * 读取当前设备已用次数，刷新不重置。
 */
export function readUsedCount(): number {
  if (typeof window === "undefined") return 0;
  const id = getDeviceId();
  if (!id) return 0;
  try {
    const raw = localStorage.getItem(usageKey(id));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * 已用次数 +1 并持久化，返回新的次数。
 */
export function bumpUsedCount(): number {
  if (typeof window === "undefined") return 0;
  const id = getDeviceId();
  if (!id) return 0;
  const next = readUsedCount() + 1;
  try {
    localStorage.setItem(usageKey(id), String(next));
  } catch {
    // 写入失败则不持久化，但仍返回递增值供本次会话使用
  }
  return next;
}
