import "server-only";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt-system";
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

    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        throw new FriendlyError("API Key 无效或已过期，请检查 .env.local 配置。");
      }
      if (err.status === 402) {
        throw new FriendlyError("账户余额不足，请检查你的 API 服务额度。");
      }
      if (err.status === 429) {
        throw new FriendlyError("请求过于频繁或已达速率上限，请稍后再试。");
      }
    }
    throw new FriendlyError("调用 AI 服务时出错，请稍后重试。");
  }
}
