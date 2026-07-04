// 纯前端的结果文本处理工具（不涉及 API）

// 自然语言版小节的标题标记
const NL_MARKER = "【自然语言版";
// 第三部分「进阶提示」的起始标记，用于界定自然语言版的结尾
const NEXT_SECTION_MARKER = "💡";

/**
 * 从完整输出中抽取「自然语言版·可直接复制到即梦」这一段的正文。
 * 找不到时返回 null（此时不显示「复制自然语言版」按钮）。
 */
export function extractNaturalLanguage(text: string): string | null {
  const start = text.indexOf(NL_MARKER);
  if (start === -1) return null;

  // 跳过标题所在行，只取正文
  const lineEnd = text.indexOf("\n", start);
  const bodyStart = lineEnd === -1 ? start : lineEnd + 1;

  let end = text.indexOf(NEXT_SECTION_MARKER, bodyStart);
  if (end === -1) end = text.length;

  const segment = text
    .slice(bodyStart, end)
    .replace(/```/g, "") // 去掉可能残留的代码围栏
    .trim();

  return segment || null;
}
