"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ParamGroup from "@/components/ParamGroup";
import ResultBlock from "@/components/ResultBlock";
import { generatePrompt } from "@/lib/generate";
import {
  CAMERA_OPTIONS,
  LIGHTING_OPTIONS,
  SHOTS_OPTIONS,
  MAX_INPUT,
} from "@/lib/params";

const NAV = ["示例库", "帮助文档", "设置", "导出"];

export default function Home() {
  const [input, setInput] = useState("");
  const [camera, setCamera] = useState<string>(CAMERA_OPTIONS[3]); // 推进
  const [lighting, setLighting] = useState<string>(LIGHTING_OPTIONS[1]); // 黄金时刻
  const [shots, setShots] = useState<string>(SHOTS_OPTIONS[3]); // 四镜头
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setCopied(false);
    try {
      const { prompt } = await generatePrompt(input, {
        camera,
        lighting,
        shots,
      });
      setResult(prompt);
    } finally {
      setLoading(false);
    }
  }, [input, camera, lighting, shots, loading]);

  // ⌘↩ / Ctrl+↩ 触发生成
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleGenerate]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时静默失败
    }
  }, [result]);

  const handleClear = useCallback(() => {
    setResult("");
    setCopied(false);
  }, []);

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-lg font-semibold tracking-wide text-ink">
            AI 视频提示词生成器
          </h1>
          <span className="rounded border border-vermilion px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-vermilion">
            PRO
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            专业级电影提示词生成工具
          </span>
        </div>
        <nav className="flex items-center gap-5 text-[13px] text-muted">
          {NAV.map((item) => (
            <button
              key={item}
              type="button"
              className="transition-colors hover:text-ink"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      {/* 主体双栏 */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        {/* 左栏：创意输入 */}
        <section className="flex flex-col gap-6 border-b border-hairline p-6 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-sm font-medium tracking-wide text-ink">
                创意输入
              </h2>
              <span className="font-mono text-xs text-muted">
                {input.length}/{MAX_INPUT}
              </span>
            </div>
            <textarea
              value={input}
              maxLength={MAX_INPUT}
              onChange={(e) => setInput(e.target.value)}
              placeholder="用一句话描述你想要生成的视频画面或故事"
              className="h-36 w-full rounded border border-hairline bg-transparent p-4 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-muted focus:outline-none"
            />
          </div>

          {/* 参数设置 */}
          <div className="flex flex-col gap-5">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
              参数设置
            </h3>
            <ParamGroup
              label="运镜方式"
              options={CAMERA_OPTIONS}
              value={camera}
              onChange={setCamera}
            />
            <ParamGroup
              label="光线氛围"
              options={LIGHTING_OPTIONS}
              value={lighting}
              onChange={setLighting}
            />
            <ParamGroup
              label="镜头数量"
              options={SHOTS_OPTIONS}
              value={shots}
              onChange={setShots}
            />
          </div>

          {/* 高级选项（可折叠） */}
          <div className="border-t border-hairline pt-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between text-[13px] text-muted transition-colors hover:text-ink"
            >
              <span>高级选项（可选）</span>
              <span className="font-mono text-xs">
                {advancedOpen ? "−" : "+"}
              </span>
            </button>
            {advancedOpen && (
              <div className="mt-4 flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-muted">画面风格关键词</span>
                  <input
                    type="text"
                    placeholder="如：赛博朋克、水墨、胶片颗粒"
                    className="rounded border border-hairline bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-muted focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs text-muted">负面提示（Negative）</span>
                  <input
                    type="text"
                    placeholder="如：过曝、卡通渲染、水印"
                    className="rounded border border-hairline bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-muted focus:outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* 主按钮：唯一实心朱砂红 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded bg-vermilion px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            <span>{loading ? "生成中…" : "生成提示词"}</span>
            <span className="font-mono text-xs text-white/70">⌘↩</span>
          </button>
        </section>

        {/* 右栏：生成结果 */}
        <section className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-sm font-medium tracking-wide text-ink">
              生成结果
            </h2>
            <div className="flex items-center gap-4 text-[13px] text-muted">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!result}
                className="transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
              >
                {copied ? "已复制" : "复制"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!result}
                className="transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
              >
                清空
              </button>
            </div>
          </div>

          {result ? (
            <ResultBlock content={result} />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded border border-dashed border-hairline bg-code/40 p-10">
              <p className="text-center font-mono text-xs leading-relaxed text-muted">
                尚未生成提示词
                <br />
                在左栏输入创意并点击「生成提示词」
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 底栏 */}
      <footer className="flex items-center justify-between border-t border-hairline px-6 py-3 text-xs text-muted">
        <span>© 2025 AI Prompt Studio</span>
        <div className="flex items-center gap-4">
          <span className="font-mono">v0.1.0</span>
          <button type="button" className="transition-colors hover:text-ink">
            检查更新
          </button>
        </div>
      </footer>
    </div>
  );
}
