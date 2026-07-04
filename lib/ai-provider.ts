import "server-only";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt-system";
import { CAMERA_OPTIONS, LIGHTING_OPTIONS, SHOTS_OPTIONS } from "./params";
import type { GenerateParams } from "./generate";

// ---------------------------------------------------------------------------
// Provider 抽象：现在默认 deepseek，预留 claude 分支，方便以后切换 / 对比。
// DeepSeek 与 Anthropic 都提供 OpenAI 兼容接口，故统一用 openai SDK 调用。
// ---------------------------------------------------------------------------

export type ProviderName = "deepseek" | "claude";

interface ProviderConfig {
  baseURL: string;
  apiKey: string | undefined;
  model: string;
}

// 每次调用时读取 env，避免构建期把空值固化下来
const PROVIDERS: Record<ProviderName, () => ProviderConfig> = {
  deepseek: () => ({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: "deepseek-chat",
  }),
  claude: () => ({
    baseURL: "https://api.anthropic.com/v1",
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-sonnet-4-6",
  }),
};

// 当前启用的 provider —— 之后切换只改这一行
export const ACTIVE_PROVIDER: ProviderName = "deepseek";

// 面向用户的友好错误（route 会把 message 原样返回给前端）
export class FriendlyError extends Error {}

/**
 * 真正调用 AI 生成提示词（服务端执行，绝不在前端运行）。
 * 内部：SYSTEM_PROMPT 作 system message，buildUserMessage 拼 user message，
 * temperature 0.8，返回模型输出纯文本。
 */
export async function generatePromptFromAI(
  input: string,
  params: GenerateParams
): Promise<{ prompt: string }> {
  const cfg = PROVIDERS[ACTIVE_PROVIDER]();

  if (!cfg.apiKey) {
    throw new FriendlyError(
      `未配置 ${ACTIVE_PROVIDER} 的 API Key，请在项目根目录 .env.local 中设置后重启开发服务器。`
    );
  }

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });

  const userMessage = buildUserMessage({
    idea: input,
    camera: params.camera,
    lighting: params.lighting,
    shotCount: params.shots,
  });

  try {
    const completion = await client.chat.completions.create({
      model: cfg.model,
      temperature: 0.8,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new FriendlyError("模型返回内容为空，请稍后重试。");
    }
    return { prompt: text };
  } catch (err) {
    if (err instanceof FriendlyError) throw err;

    // 真实错误详情只打到服务端日志，前端只给友好提示
    console.error("[ai-provider] 调用失败:", err);

    throw mapApiError(err);
  }
}

// 把底层 API 错误映射成友好错误
function mapApiError(err: unknown): FriendlyError {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) {
      return new FriendlyError("API Key 无效或已过期，请检查 .env.local 配置。");
    }
    if (err.status === 402) {
      return new FriendlyError("账户余额不足，请检查你的 API 服务额度。");
    }
    if (err.status === 429) {
      return new FriendlyError("请求过于频繁或已达速率上限，请稍后再试。");
    }
  }
  return new FriendlyError("调用 AI 服务时出错，请稍后重试。");
}

// ---------------------------------------------------------------------------
// AI 参数推荐（轻量、快、省成本）：只让模型从给定选项里各挑一个，返回精简 JSON。
// ---------------------------------------------------------------------------

export interface RecommendedParams {
  camera: string; // 运镜方式
  lighting: string; // 光线氛围
  shotCount: string; // 镜头数量
}

// 简短 system prompt（不复用完整 SYSTEM_PROMPT），约束模型只输出 JSON
const RECOMMEND_SYSTEM = `你是视频拍摄参数推荐助手。根据用户一句话灵感，从下列选项中各挑选最合适的一个，只返回 JSON，不要任何解释或多余文字。
运镜方式(camera) 可选：${CAMERA_OPTIONS.join("、")}
光线氛围(lighting) 可选：${LIGHTING_OPTIONS.join("、")}
镜头数量(shotCount) 可选：${SHOTS_OPTIONS.join("、")}
严格输出这种格式：{"camera":"航拍","lighting":"戏剧光","shotCount":"三镜头"}`;

// 若模型返回的值不在允许列表内，回退到第一个选项
function coerce(
  value: unknown,
  options: readonly string[],
  fallback: string
): string {
  return typeof value === "string" && options.includes(value)
    ? value
    : fallback;
}

// 从模型输出里抽出 JSON 并校验成合法参数
function parseRecommendation(text: string): RecommendedParams {
  let obj: Record<string, unknown> = {};
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      obj = JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      // 解析失败则全部走回退
    }
  }
  return {
    camera: coerce(obj.camera, CAMERA_OPTIONS, CAMERA_OPTIONS[0]),
    lighting: coerce(obj.lighting, LIGHTING_OPTIONS, LIGHTING_OPTIONS[0]),
    shotCount: coerce(obj.shotCount, SHOTS_OPTIONS, SHOTS_OPTIONS[0]),
  };
}

/**
 * 根据灵感推荐参数（服务端执行）。deepseek-chat、temperature 0.5（求稳定）、
 * max_tokens 100（省成本）。返回校验后的合法参数。
 */
export async function recommendParamsFromAI(
  idea: string
): Promise<RecommendedParams> {
  const cfg = PROVIDERS[ACTIVE_PROVIDER]();

  if (!cfg.apiKey) {
    throw new FriendlyError(
      `未配置 ${ACTIVE_PROVIDER} 的 API Key，请在项目根目录 .env.local 中设置后重启开发服务器。`
    );
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });

  try {
    const completion = await client.chat.completions.create({
      model: cfg.model, // 默认 provider 为 deepseek，即 deepseek-chat
      temperature: 0.5,
      max_tokens: 100,
      messages: [
        { role: "system", content: RECOMMEND_SYSTEM },
        { role: "user", content: idea },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return parseRecommendation(text);
  } catch (err) {
    if (err instanceof FriendlyError) throw err;
    console.error("[ai-provider] 参数推荐失败:", err);
    throw mapApiError(err);
  }
}
