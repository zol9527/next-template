"use client";

/**
 * Function: BlogLoadMore
 *
 * Description: 像素风格"加载更多"按钮组件，支持加载中和无更多数据两种状态
 *
 * Parameters:
 *   loading(boolean): 是否正在加载
 *   hasMore(boolean): 是否还有更多数据可加载
 *   onClick(() => void): 点击回调
 *
 * Returns:
 *   JSX.Element: 加载更多按钮
 */
export function BlogLoadMore({
  loading,
  hasMore,
  onClick,
}: {
  loading: boolean;
  hasMore: boolean;
  onClick: () => void;
}) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-8">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`px-8 py-3 [font-family:var(--font-press-start)] text-sm transition-colors ${
          loading
            ? "pixel-border text-[var(--color-landing-muted)] cursor-wait"
            : "pixel-border-cta text-[var(--color-landing-cta)] hover:bg-[var(--color-landing-cta)] hover:text-[var(--color-landing-background)]"
        }`}
      >
        {loading ? (
          <span className="pixel-blink">LOADING...</span>
        ) : (
          "LOAD MORE"
        )}
      </button>
    </div>
  );
}
