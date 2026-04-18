import { PixelStar } from "@/components/business/landing/pixel-sprites";

/**
 * Function: BlogEmptyState
 *
 * Description: 空数据占位组件，显示像素风格装饰和提示文字
 *
 * Parameters:
 *   keyword(string | undefined): 当前搜索关键词，用于提示文案
 *
 * Returns:
 *   JSX.Element: 空数据占位
 */
export function BlogEmptyState({
  keyword,
}: {
  keyword?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <PixelStar className="mb-6 h-16 w-16 pixel-float" />
      <h3 className="mb-2 [font-family:var(--font-press-start)] text-base text-[var(--color-landing-muted)]">
        NO DATA FOUND
      </h3>
      <p className="[font-family:var(--font-vt323)] text-lg text-[var(--color-landing-muted)]">
        {keyword
          ? `未找到与「${keyword}」相关的文章`
          : "暂无文章，请稍后再来看看"}
      </p>
    </div>
  );
}
