"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * Function: BlogSearchBar
 *
 * Description: 像素风格搜索栏组件，输入内容经过防抖处理后触发回调
 *
 * Parameters:
 *   initialKeyword(string): 初始搜索关键词
 *   onSearch((keyword: string) => void): 搜索回调函数，防抖 300ms 后触发
 *
 * Returns:
 *   JSX.Element: 像素风格搜索栏
 */
export function BlogSearchBar({
  initialKeyword = "",
  onSearchAction,
}: {
  initialKeyword?: string;
  onSearchAction: (keyword: string) => void;
}) {
  const [value, setValue] = useState(initialKeyword);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 当 URL keyword 变化（例如点了分类/标签或清空搜索）时，让输入框同步展示。
  useEffect(() => {
    setValue(initialKeyword);
  }, [initialKeyword]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearchAction(next), 300);
  },
  [onSearchAction],
);

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--color-landing-muted)" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="搜索文章..."
        className="w-full bg-(--color-landing-card) py-2.5 pl-12 pr-4 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-base sm:text-lg tracking-[0.06em] text-(--color-landing-foreground) placeholder:text-(--color-landing-muted) focus:outline-none pixel-border-soft pixel-border-soft-focus-primary transition-all"
      />
    </div>
  );
}
