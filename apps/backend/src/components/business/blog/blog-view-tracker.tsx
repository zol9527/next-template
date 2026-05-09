'use client';

import { useEffect } from 'react';

interface BlogViewTrackerProps {
  slug: string;
}

// 模块级去重集合：防止 StrictMode 双重挂载或快速重渲染导致重复计数
const trackedSlugs = new Set<string>();

export default function BlogViewTracker({ slug }: BlogViewTrackerProps) {
  useEffect(() => {
    if (trackedSlugs.has(slug)) return;
    trackedSlugs.add(slug);

    const trackView = async () => {
      try {
        const response = await fetch(`/api/v1/public/blog/articles/${slug}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            readTime: 0,
            referer: typeof window !== 'undefined' ? window.location.href : '',
          }),
        });

        if (!response.ok) {
          console.error('Failed to track article view');
        }
      } catch {
        // Silent failure as per requirements
      }
    };

    trackView();
  }, [slug]);

  return null;
}