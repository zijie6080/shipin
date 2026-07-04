"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 通用弹窗：暖炭黑面板 + 1px 描边，无阴影发光，圆角 4px。
 * 点击遮罩或按 Esc 关闭。
 */
export default function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded border border-hairline bg-canvas"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <h3 className="font-serif text-sm font-medium tracking-wide text-ink">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="font-mono text-base leading-none text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
