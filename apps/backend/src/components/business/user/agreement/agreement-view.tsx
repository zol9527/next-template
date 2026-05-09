'use client'

import * as React from 'react'
import DOMPurify from 'dompurify'
import { FileText, Calendar, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PublicAgreement } from '@/contracts/dtos/public/site-config.dto'

// 🛡️ Security: Add 'noopener noreferrer' to all target="_blank" links to prevent Reverse Tabnabbing
// We configure this at module level to avoid adding the hook repeatedly on every render
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if ('target' in node && node.getAttribute('target') === '_blank') {
      const currentRel = node.getAttribute('rel') || ''
      const newRel = [currentRel, 'noopener', 'noreferrer']
        .filter(Boolean)
        .join(' ')
        .split(' ')
        .filter((item, index, array) => array.indexOf(item) === index)
        .join(' ')

      node.setAttribute('rel', newRel)
    }

    // 移除 img 标签的空 src 属性，防止浏览器重复请求当前页面
    if (node.nodeName === 'IMG' && node.getAttribute('src')?.trim() === '') {
      node.removeAttribute('src')
    }
  })
}

/**
 * Function: AgreementView
 *
 * Description: 用户端协议内容展示组件，使用 DOMPurify 防止 XSS 攻击
 *
 * Parameters:
 *     agreement(PublicAgreement | null): 协议数据
 *     loading(boolean): 加载状态
 *     error(string | null): 错误信息
 *     onRetry(function): 重试回调
 *
 * Returns:
 *     element(React.ReactElement): 协议内容展示 UI
 */
export function AgreementView({
  agreement,
  loading = false,
  error = null,
  onRetry,
}: {
  agreement: PublicAgreement | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  // 配置 DOMPurify 允许的标签和属性
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote',
        'a', 'img',
        'span', 'div',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class',
        'target', 'rel',
      ],
      ALLOW_DATA_ATTR: false,
      SAFE_FOR_TEMPLATES: true,
    })
  }

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">加载协议内容中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">加载失败</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              重试
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 无数据状态
  if (!agreement) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">暂无协议内容</p>
        </div>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    USER_AGREEMENT: '用户协议',
    PRIVACY_POLICY: '隐私政策',
    ABOUT_US: '关于我们',
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <div className="border-b border-border/10 bg-card/20 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {agreement.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Tag className="h-3 w-3" />
                {typeLabels[agreement.type] || agreement.type}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                版本 {agreement.version}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          生效日期：{new Date(agreement.effectiveAt).toLocaleDateString('zh-CN')}
        </div>
      </div>

      {/* 协议内容 */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(agreement.content),
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
