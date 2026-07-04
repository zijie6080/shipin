"use client";

interface ParamGroupProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * 一组横向单选标签。
 * 激活态：1px 朱砂红描边 + 文字变红（不使用整块红填充）。
 */
export default function ParamGroup({
  label,
  options,
  value,
  onChange,
}: ParamGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={[
                "rounded border px-3 py-1.5 text-[13px] leading-none transition-colors",
                active
                  ? "border-vermilion text-vermilion"
                  : "border-hairline text-ink/80 hover:border-muted",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
