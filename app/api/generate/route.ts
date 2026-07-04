import { NextResponse } from "next/server";
import { generatePromptFromAI, FriendlyError } from "@/lib/ai-provider";
import {
  peekUsage,
  consumeUsage,
  clientIdentifier,
  type Usage,
} from "@/lib/ratelimit";
import type { GenerateParams } from "@/lib/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GenerateRequestBody {
  input?: string;
  params?: Partial<GenerateParams>;
  deviceId?: string;
}

export async function POST(req: Request) {
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const params = body.params ?? {};

  if (!input) {
    return NextResponse.json(
      { error: "请先输入一句话创意描述。" },
      { status: 400 }
    );
  }

  // 服务端限次：先看额度，用完直接拒绝（不调用模型）
  const id = clientIdentifier(req, body.deviceId);
  const gate = await peekUsage(id);
  if (gate.enabled && gate.remaining <= 0) {
    return NextResponse.json(
      { error: "免费次数已用完", limited: true, usage: gate },
      { status: 429 }
    );
  }

  // 通过额度检查：本次计入用量（每次实际调用都算，防刷）
  const usage: Usage = gate.enabled ? await consumeUsage(id) : gate;

  const { camera = "", lighting = "", shots = "" } = params;

  try {
    const result = await generatePromptFromAI(input, { camera, lighting, shots });
    return NextResponse.json({ ...result, usage });
  } catch (err) {
    if (err instanceof FriendlyError) {
      return NextResponse.json({ error: err.message, usage }, { status: 502 });
    }
    console.error("[api/generate] 未预期错误:", err);
    return NextResponse.json(
      { error: "生成失败，请稍后重试。", usage },
      { status: 500 }
    );
  }
}
