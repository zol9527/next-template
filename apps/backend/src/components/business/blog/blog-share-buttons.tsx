'use client';

import { useState } from 'react';

interface BlogShareButtonsProps {
  article: {
    title: string;
    slug: string;
  };
}

/**
 * BlogShareButtons Component
 * 
 * Description: Client component for sharing blog articles with Twitter/X and copy link functionality
 * 
 * Parameters:
 *   article (BlogShareButtonsProps): Article data including title and slug for sharing
 * 
 * Returns:
 *   JSX.Element: Share buttons with pixel art styling and copy link functionality
 */
export default function BlogShareButtons({ article }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(
      `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${article.slug}`
    )}`;
    window.open(url, '_blank', 'noopener noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${article.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center gap-4 mt-8">
      <button
        type="button"
        onClick={handleTwitterShare}
        className="px-4 py-2 bg-[var(--color-landing-primary)] text-[var(--color-landing-background)] border-2 border-[var(--color-landing-border)] [font-family:var(--font-press-start)] text-xs tracking-wider hover:bg-[var(--color-landing-cta)] transition-colors duration-200"
      >
        分享到 Twitter
      </button>
      
      <button
        type="button"
        onClick={handleCopyLink}
        className="px-4 py-2 bg-[var(--color-landing-card)] text-[var(--color-landing-foreground)] border-2 border-[var(--color-landing-border)] [font-family:var(--font-press-start)] text-xs tracking-wider hover:bg-[var(--color-landing-primary)] hover:text-[var(--color-landing-background)] transition-colors duration-200"
      >
        {copied ? '已复制!' : '复制链接'}
      </button>
    </div>
  );
}