// 轻量加载指示器：细描边旋转圈，颜色继承 currentColor（贴合暗色主题，无发光）
export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
