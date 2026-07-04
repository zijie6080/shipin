import { NextResponse } from "next/server";
import { generatePromptFromAI, FriendlyError } from "@/lib/ai-provider";
import type { GenerateParams } from "@/lib/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GenerateRequestBody {
  input?: string;
  params?: Partial<GenerateParams>;
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

  const { camera = "", lighting = "", shots = "" } = params;

  try {
    const result = await generatePromptFromAI(input, { camera, lighting, shots });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FriendlyError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[api/generate] 未预期错误:", err);
    return NextResponse.json(
      { error: "生成失败，请稍后重试。" },
      { status: 500 }
    );
  }
}
