'use client';

import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { PublicBlogArticle } from '@/contracts/dtos/public/blog/articles.dto';
import SplitText from '@/components/SplitText';
import DecryptedText from '@/components/DecryptedText';

interface BlogArticleHeaderProps {
  article: PublicBlogArticle;
  readingTime?: number; // 阅读时间（分钟）
}

/**
 * BlogArticleHeader Component
 * 
 * Description: 博客文章头部展示组件，包含返回按钮、封面图、标题动画、分类标签和元数据信息
 * 
 * Parameters:
 *   article (PublicBlogArticle): 文章数据，包含标题、封面图、分类、标签、作者等
 *   readingTime (number, optional): 预计阅读时间（分钟）
 * 
 * Returns:
 *   JSX.Element: 渲染的文章头部区域，含返回按钮、标题、分类标签、元信息及封面图
 */
export default function BlogArticleHeader({ article, readingTime }: BlogArticleHeaderProps) {
  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center">
        <a 
          href="/blog" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-landing-card)] text-[var(--color-landing-foreground)] border border-[var(--color-landing-border)] hover:bg-[var(--color-landing-primary)] hover:text-[var(--color-landing-background)] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="[font-family:var(--font-press-start)] text-xs">返回博客</span>
        </a>
      </div>

      {/* 封面图 */}
      {article.coverImage && (
        <div className="relative">
          <img 
            src={article.coverImage} 
            alt={article.title}
            className="w-full h-64 object-cover border-4 border-[var(--color-landing-border)] shadow-[0_0_0_2px_var(--color-landing-primary)]"
          />
        </div>
      )}

      {/* 标题与分类标签 */}
      <div className="space-y-4">
        {/* 使用 SplitText 实现标题逐字动画效果 */}
        <SplitText
          text={article.title}
          tag="h1"
          className="text-2xl sm:text-3xl lg:text-4xl [font-family:var(--font-archivo)] font-bold text-[var(--color-landing-foreground)] tracking-tight leading-relaxed"
          delay={30}
          duration={0.8}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-50px"
          textAlign="left"
        />
        
        <div className="flex items-center gap-4">
          {/* 分类徽章 */}
          <span className="px-3 py-1 bg-[var(--color-landing-primary)] text-[var(--color-landing-background)] border-2 border-[var(--color-landing-border)] [font-family:var(--font-press-start)] text-[10px] tracking-wider">
            {article.categoryName}
          </span>
          
          {/* 标签列表 */}
          <div className="flex gap-2">
            {article.tagNames.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-1 bg-[var(--color-landing-card)] border border-[var(--color-landing-border)] text-[var(--color-landing-foreground)] [font-family:var(--font-press-start)] text-[10px] tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 元数据信息 */}
      <div className="flex flex-wrap items-center gap-4 text-sm [font-family:var(--font-space-grotesk)] text-[var(--color-landing-foreground)]">
        <span>作者: {article.authorName ?? '未知'}</span>
        {article.publishedAt && <span>发布时间: {format(new Date(article.publishedAt), 'yyyy-MM-dd')}</span>}
        <span>浏览次数: {article.viewCount}</span>
        {/* 使用 DecryptedText 展示阅读时间解密动画效果 */}
        {readingTime != null && (
          <DecryptedText
            text={`阅读时间: 约 ${readingTime} 分钟`}
            speed={40}
            maxIterations={8}
            sequential={true}
            revealDirection="start"
            animateOn="view"
            className="text-[var(--color-landing-primary)]"
          />
        )}
      </div>
    </div>
  );
}
