import { NextResponse } from "next/server";
import { recommendParamsFromAI, FriendlyError } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecommendRequestBody {
  idea?: string;
}

export async function POST(req: Request) {
  let body: RecommendRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  }

  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  if (!idea) {
    return NextResponse.json(
      { error: "请先输入一句话创意描述。" },
      { status: 400 }
    );
  }

  try {
    const params = await recommendParamsFromAI(idea);
    return NextResponse.json(params);
  } catch (err) {
    if (err instanceof FriendlyError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[api/recommend] 未预期错误:", err);
    return NextResponse.json(
      { error: "参数推荐失败，请稍后重试。" },
      { status: 500 }
    );
  }
}
