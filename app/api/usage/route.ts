import { NextResponse } from "next/server";
import { peekUsage, clientIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 只读当前设备/IP 的用量，用于页面初次加载时准确显示剩余次数（不增加计数）。
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId") ?? undefined;
  const id = clientIdentifier(req, deviceId);
  const usage = await peekUsage(id);
  return NextResponse.json({ usage });
}
