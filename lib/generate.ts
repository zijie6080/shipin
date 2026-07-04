// 前端调用入口。真正的 AI 调用在服务端 /api/generate 内完成，
// API Key 只存在于服务端，绝不暴露到浏览器。

// 提示词生成参数与结果类型定义
export interface GenerateParams {
  camera: string; // 运镜方式
  lighting: string; // 光线氛围
  shots: string; // 镜头数量
}

export interface GenerateResult {
  // 输出结果的纯文本（用于复制与展示）
  prompt: string;
  // 是否为错误提示（true 时 prompt 内为友好错误信息）
  error?: boolean;
}

/**
 * 生成结构化视频提示词。
 *
 * 通过 fetch 调用服务端 /api/generate，由服务端读取 SYSTEM_PROMPT、
 * 拼装 user message 并调用 AI API。函数签名保持前端原有用法不变。
 *
 * 任何失败都会以友好文案的形式返回（不会 reject），避免页面崩溃。
 */
export async function generatePrompt(
  input: string,
  params: GenerateParams
): Promise<GenerateResult> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, params }),
    });

    let data: { prompt?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      // 响应体不是 JSON（如网关错误页）
    }

    if (!res.ok) {
      return {
        prompt: data.error || "生成失败，请稍后重试。",
        error: true,
      };
    }

    return { prompt: data.prompt ?? "" };
  } catch {
    return {
      prompt: "网络错误：无法连接到生成服务，请检查网络后重试。",
      error: true,
    };
  }
}
