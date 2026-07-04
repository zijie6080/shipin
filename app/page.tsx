"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ParamGroup from "@/components/ParamGroup";
import ResultBlock from "@/components/ResultBlock";
import Modal from "@/components/Modal";
import {
  generatePrompt,
  recommendParams,
  type RecommendedParams,
} from "@/lib/generate";
import { EXAMPLES } from "@/lib/examples";
import { extractNaturalLanguage } from "@/lib/result-utils";
import {
  CAMERA_OPTIONS,
  LIGHTING_OPTIONS,
  SHOTS_OPTIONS,
  MAX_INPUT,
} from "@/lib/params";

// 免费使用次数上限（简单版：仅按本次会话前端计数，防止 API 被刷爆）
// TODO: 之后升级为按设备/账号的真实限制
const FREE_LIMIT = 5;

// 一次生成的历史记录（仅存于本次会话内存，不落 localStorage）
interface HistoryEntry {
  id: string;
  input: string;
  camera: string;
  lighting: string;
  shots: string;
  prompt: string;
  at: number;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [camera, setCamera] = useState<string>(CAMERA_OPTIONS[3]); // 推进
  const [lighting, setLighting] = useState<string>(LIGHTING_OPTIONS[1]); // 黄金时刻
  const [shots, setShots] = useState<string>(SHOTS_OPTIONS[3]); // 四镜头
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNL, setCopiedNL] = useState(false);

  // 本次会话已生成次数
  const [usedCount, setUsedCount] = useState(0);
  const remaining = Math.max(0, FREE_LIMIT - usedCount);
  const reachedLimit = usedCount >= FREE_LIMIT;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // AI 参数推荐相关
  const [recommending, setRecommending] = useState(false);
  const [recommendMsg, setRecommendMsg] = useState<string | null>(null);
  // 用户是否手动改过参数（改过就不再自动推荐）
  const [userTouched, setUserTouched] = useState(false);
  // 哪些参数当前来自 AI 推荐（用于展示标记）
  const [aiMarks, setAiMarks] = useState({
    camera: false,
    lighting: false,
    shots: false,
  });

  // 自然语言版正文（存在时才显示「复制自然语言版」按钮）
  const naturalLanguage = useMemo(
    () => (result ? extractNaturalLanguage(result) : null),
    [result]
  );

  // 让 AI 推荐参数并选中到界面。返回推荐值（供自动触发时立即使用）或 null。
  const doRecommend = useCallback(async (): Promise<RecommendedParams | null> => {
    if (!input.trim()) {
      setRecommendMsg("请先输入一句话灵感");
      return null;
    }
    setRecommending(true);
    setRecommendMsg(null);
    try {
      const r = await recommendParams(input);
      if (r.error || !r.params) {
        setRecommendMsg(r.message || "推荐失败，请重试");
        return null;
      }
      setCamera(r.params.camera);
      setLighting(r.params.lighting);
      setShots(r.params.shotCount);
      setAiMarks({ camera: true, lighting: true, shots: true });
      return r.params;
    } finally {
      setRecommending(false);
    }
  }, [input]);

  // 用指定参数走完整生成流程
  const generateWith = useCallback(
    async (c: string, l: string, s: string) => {
      setLoading(true);
      setCopied(false);
      setCopiedNL(false);
      try {
        const res = await generatePrompt(input, {
          camera: c,
          lighting: l,
          shots: s,
        });
        setResult(res.prompt);
        // 每次实际生成都计入免费额度（防刷）
        setUsedCount((n) => n + 1);
        // 只有成功的结果才进历史
        if (!res.error && res.prompt.trim()) {
          setHistory((prev) => [
            {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : String(Date.now()),
              input,
              camera: c,
              lighting: l,
              shots: s,
              prompt: res.prompt,
              at: Date.now(),
            },
            ...prev,
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [input]
  );

  const handleGenerate = useCallback(async () => {
    if (loading || recommending || reachedLimit) return;

    let c = camera;
    let l = lighting;
    let s = shots;

    // 用户没手动选过参数、也还没 AI 推荐过 → 生成前先自动推荐一次
    const noAiYet = !aiMarks.camera && !aiMarks.lighting && !aiMarks.shots;
    if (!userTouched && noAiYet && input.trim()) {
      const rec = await doRecommend();
      if (rec) {
        c = rec.camera;
        l = rec.lighting;
        s = rec.shotCount;
      }
    }

    await generateWith(c, l, s);
  }, [
    loading,
    recommending,
    reachedLimit,
    camera,
    lighting,
    shots,
    userTouched,
    aiMarks,
    input,
    doRecommend,
    generateWith,
  ]);

  // 用户手动改某个参数：清掉该组的 AI 标记，并标记为已手动操作
  const changeCamera = useCallback((v: string) => {
    setCamera(v);
    setUserTouched(true);
    setAiMarks((m) => ({ ...m, camera: false }));
  }, []);
  const changeLighting = useCallback((v: string) => {
    setLighting(v);
    setUserTouched(true);
    setAiMarks((m) => ({ ...m, lighting: false }));
  }, []);
  const changeShots = useCallback((v: string) => {
    setShots(v);
    setUserTouched(true);
    setAiMarks((m) => ({ ...m, shots: false }));
  }, []);

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

  // 通用复制：写剪贴板并短暂高亮
  const copyText = useCallback(
    async (text: string, setFlag: (v: boolean) => void) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setFlag(true);
        setTimeout(() => setFlag(false), 1500);
      } catch {
        // 剪贴板不可用时静默失败
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    setResult("");
    setCopied(false);
    setCopiedNL(false);
  }, []);

  const applyExample = useCallback((text: string) => {
    setInput(text);
    setExamplesOpen(false);
  }, []);

  const restoreHistory = useCallback((entry: HistoryEntry) => {
    setInput(entry.input);
    setCamera(entry.camera);
    setLighting(entry.lighting);
    setShots(entry.shots);
    setResult(entry.prompt);
    // 恢复的是历史里的既定参数，视为已确定，清掉 AI 标记
    setUserTouched(true);
    setAiMarks({ camera: false, lighting: false, shots: false });
    setHistoryOpen(false);
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
          <button
            type="button"
            onClick={() => setExamplesOpen(true)}
            className="transition-colors hover:text-ink"
          >
            示例库
          </button>
          {["帮助文档", "设置", "导出"].map((item) => (
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

            {/* @引用教学（默认折叠） */}
            <div className="rounded border border-hairline">
              <button
                type="button"
                onClick={() => setReferenceOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <span>💡 如果你有参考图/视频</span>
                <span className="font-mono text-xs">
                  {referenceOpen ? "−" : "+"}
                </span>
              </button>
              {referenceOpen && (
                <div className="border-t border-hairline px-3 py-3 text-xs leading-relaxed text-muted">
                  {/* TODO: 文案占位，之后由你补充 */}
                  <p>
                    即梦 Seedance 支持用{" "}
                    <span className="font-mono text-vermilion">@</span>{" "}
                    引用你上传的参考素材，让生成更贴合你的想法：
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>
                      有主角定妆图 → 加一句「参考{" "}
                      <span className="font-mono text-vermilion">@图片1</span>{" "}
                      的人物形象」
                    </li>
                    <li>
                      想复刻某段运镜 → 加一句「完全参考{" "}
                      <span className="font-mono text-vermilion">@视频1</span>{" "}
                      的运镜和转场」
                    </li>
                  </ul>
                  <p className="mt-2 opacity-70">（示例文案，稍后补充完整说明）</p>
                </div>
              )}
            </div>
          </div>

          {/* 参数设置 */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
                参数设置
              </h3>
              <div className="flex items-center gap-3">
                {recommendMsg && (
                  <span className="text-[11px] text-vermilion">
                    {recommendMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={doRecommend}
                  disabled={recommending || loading || !input.trim()}
                  className="rounded border border-hairline px-2.5 py-1 text-[12px] text-ink/80 transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {recommending ? "推荐中…" : "AI 帮我推荐参数"}
                </button>
              </div>
            </div>
            <ParamGroup
              label="运镜方式"
              options={CAMERA_OPTIONS}
              value={camera}
              onChange={changeCamera}
              aiRecommended={aiMarks.camera}
            />
            <ParamGroup
              label="光线氛围"
              options={LIGHTING_OPTIONS}
              value={lighting}
              onChange={changeLighting}
              aiRecommended={aiMarks.lighting}
            />
            <ParamGroup
              label="镜头数量"
              options={SHOTS_OPTIONS}
              value={shots}
              onChange={changeShots}
              aiRecommended={aiMarks.shots}
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

          {/* 免费次数提示 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">免费额度（本次会话）</span>
            <span className="font-mono">
              {reachedLimit ? (
                <span className="text-vermilion">已用完 {FREE_LIMIT}/{FREE_LIMIT}</span>
              ) : (
                <span className="text-muted">
                  还剩 <span className="text-ink">{remaining}</span> / {FREE_LIMIT} 次
                </span>
              )}
            </span>
          </div>

          {/* 主按钮：唯一实心朱砂红 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || recommending || reachedLimit}
            className="flex w-full items-center justify-center gap-3 rounded bg-vermilion px-4 py-3 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              {reachedLimit
                ? "免费次数已用完"
                : recommending
                  ? "AI 推荐参数中…"
                  : loading
                    ? "生成中…"
                    : "生成提示词"}
            </span>
            {!reachedLimit && !recommending && !loading && (
              <span className="font-mono text-xs text-white/70">⌘↩</span>
            )}
          </button>

          {/* 达上限后的付费引导占位区 */}
          {reachedLimit && (
            <div className="rounded border border-hairline p-4 text-center">
              <p className="text-[13px] text-ink">免费次数已用完</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {/* TODO: 之后放付费引导，如加微信 / 扫码解锁更多次数 */}
                （此处之后放置付费引导：加微信 / 扫码解锁更多生成次数）
              </p>
            </div>
          )}
        </section>

        {/* 右栏：生成结果 */}
        <section className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-sm font-medium tracking-wide text-ink">
              生成结果
            </h2>
            <div className="flex items-center gap-4 text-[13px] text-muted">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                disabled={history.length === 0}
                className="transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
              >
                历史{history.length > 0 ? ` (${history.length})` : ""}
              </button>
              {naturalLanguage && (
                <button
                  type="button"
                  onClick={() => copyText(naturalLanguage, setCopiedNL)}
                  className="transition-colors hover:text-ink"
                >
                  {copiedNL ? "已复制" : "复制自然语言版"}
                </button>
              )}
              <button
                type="button"
                onClick={() => copyText(result, setCopied)}
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

      {/* 示例库弹窗 */}
      <Modal
        open={examplesOpen}
        title="示例库 · 精选灵感"
        onClose={() => setExamplesOpen(false)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.category}
              type="button"
              onClick={() => applyExample(ex.text)}
              className="flex flex-col gap-2 rounded border border-hairline p-3 text-left transition-colors hover:border-muted"
            >
              <span className="w-fit rounded border border-hairline px-1.5 py-0.5 text-[11px] text-muted">
                {ex.category}
              </span>
              <span className="text-[13px] leading-relaxed text-ink/90">
                {ex.text}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          点击任一示例即可填入输入框，你可再调整参数后自行生成。
        </p>
      </Modal>

      {/* 生成历史弹窗 */}
      <Modal
        open={historyOpen}
        title={`生成历史 · 本次会话 (${history.length})`}
        onClose={() => setHistoryOpen(false)}
      >
        {history.length === 0 ? (
          <p className="text-sm text-muted">本次会话还没有生成记录。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((entry, idx) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => restoreHistory(entry)}
                  className="flex w-full flex-col gap-1 rounded border border-hairline p-3 text-left transition-colors hover:border-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted">
                      #{history.length - idx} ·{" "}
                      {new Date(entry.at).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {entry.camera} / {entry.lighting} / {entry.shots}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-[13px] leading-relaxed text-ink/90">
                    {entry.input || "（未填写灵感）"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
