"use client";

import { Fragment, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface ResultBlockProps {
  content: string;
}

// 匹配 @establishing_shot @wide @drone 这类引用（split 时保留分隔符）
const REF_SPLIT = /(@[a-zA-Z0-9_]+)/g;
// 判定某段是否为完整引用（无 g 标志，避免 lastIndex 状态问题）
const REF_TEST = /^@[a-zA-Z0-9_]+$/;

// 递归地把文本节点里的 @引用 高亮为朱砂红
function highlightRefs(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    const parts = node.split(REF_SPLIT);
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
  if (Array.isArray(node)) {
    return node.map((n, i) => <Fragment key={i}>{highlightRefs(n)}</Fragment>);
  }
  return node;
}

// 去掉代码围栏 ``` 行，让被围栏包住的 # / ## 能被解析成标题
function stripFences(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*```/.test(line))
    .join("\n");
}

// react-markdown 各元素的深色 + 等宽样式，并对文本做 @引用 高亮
const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-5 border-b border-hairline pb-1.5 text-[15px] font-bold text-ink first:mt-0">
      {highlightRefs(children)}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-[14px] font-semibold text-ink first:mt-0">
      {highlightRefs(children)}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-[13px] font-semibold text-ink first:mt-0">
      {highlightRefs(children)}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 text-[13px] font-medium text-ink/90 first:mt-0">
      {highlightRefs(children)}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-1.5 leading-6 text-ink/90">{highlightRefs(children)}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-5 text-ink/90">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-5 text-ink/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-6">{highlightRefs(children)}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{highlightRefs(children)}</strong>
  ),
  em: ({ children }) => <em className="italic">{highlightRefs(children)}</em>,
  a: ({ children, href }) => (
    <a href={href} className="text-vermilion underline underline-offset-2">
      {highlightRefs(children)}
    </a>
  ),
  hr: () => <hr className="my-4 border-hairline" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-hairline pl-3 text-muted">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-hairline/40 px-1 py-0.5 text-ink">
      {highlightRefs(children)}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto whitespace-pre-wrap">{children}</pre>
  ),
};

/**
 * 结果区：Markdown 渲染（# / ## 显示为标题），深色代码块底色 #100D0B，
 * 等宽字体，@引用高亮为朱砂红。
 */
export default function ResultBlock({ content }: ResultBlockProps) {
  return (
    <div className="overflow-x-auto rounded border border-hairline bg-code px-5 py-4 font-mono text-[13px] leading-6 text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {stripFences(content)}
      </ReactMarkdown>
    </div>
  );
}
