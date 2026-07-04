"use client";

import { Fragment } from "react";

interface ResultBlockProps {
  content: string;
}

// 匹配 @establishing_shot @wide @drone 这类引用（split 时保留分隔符）
const REF_SPLIT = /(@[a-zA-Z0-9_]+)/g;
// 单独用于判定某段是否为一个完整引用（无 g 标志，避免 lastIndex 状态问题）
const REF_TEST = /^@[a-zA-Z0-9_]+$/;

// 将单行文本中的 @引用 高亮为朱砂红
function renderLine(line: string) {
  const parts = line.split(REF_SPLIT);
  return parts.map((part, i) =>
    REF_TEST.test(part) ? (
      <span key={i} className="text-vermilion">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/**
 * 结果区代码块：等宽字体、左侧行号、背景 #100D0B。
 */
export default function ResultBlock({ content }: ResultBlockProps) {
  const lines = content.split("\n");
  const gutterWidth = String(lines.length).length;

  return (
    <div className="overflow-x-auto rounded border border-hairline bg-code font-mono text-[13px] leading-6">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} className="align-top">
              <td
                className="select-none border-r border-hairline px-3 py-0 text-right text-muted/60"
                style={{ width: `${gutterWidth + 2}ch` }}
              >
                {idx + 1}
              </td>
              <td className="whitespace-pre-wrap px-4 py-0 text-ink">
                {line ? renderLine(line) : " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
