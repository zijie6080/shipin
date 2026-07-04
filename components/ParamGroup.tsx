"use client";

interface ParamGroupProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  // 当前选中值是否来自 AI 推荐（用于展示视觉标记）
  aiRecommended?: boolean;
}

/**
 * 一组横向单选标签。
 * 激活态：1px 朱砂红描边 + 文字变红（不使用整块红填充）。
 * AI 推荐：组标题旁加「AI 推荐」小标，选中标签前加一个小圆点。
 */
export default function ParamGroup({
  label,
  options,
  value,
  onChange,
  aiRecommended = false,
}: ParamGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-wide text-muted">{label}</span>
        {aiRecommended && (
          <span className="flex items-center gap-1 rounded border border-vermilion/60 px-1.5 py-0.5 text-[10px] text-vermilion">
            <span className="h-1 w-1 rounded-full bg-vermilion" />
            AI 推荐
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={[
                "flex items-center gap-1.5 rounded border px-3 py-1.5 text-[13px] leading-none transition-colors",
                active
                  ? "border-vermilion text-vermilion"
                  : "border-hairline text-ink/80 hover:border-muted",
              ].join(" ")}
            >
              {active && aiRecommended && (
                <span className="h-1 w-1 rounded-full bg-vermilion" />
              )}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
