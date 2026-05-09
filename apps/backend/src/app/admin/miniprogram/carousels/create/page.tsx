'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import {
  MaterialPicker,
} from '@/components/business/admin/media/material-picker'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

/**
 * 轮播图创建页面
 * 提供表单用于创建新的小程序首页轮播图
 */
export default function CreateCarouselPage() {
  const router = useRouter()
  const { toast } = useToast()

  // 表单状态
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState('')

  // UI 状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const titleLength = title.trim().length
  const hasValidationError = Object.keys(errors).length > 0
  const isDirty = useMemo(
    () => title.trim() !== '' || link.trim() !== '' || sortOrder !== '0' || !isActive || imageUrl.trim() !== '',
    [title, link, sortOrder, isActive, imageUrl]
  )
  const isSubmitDisabled = isSubmitting || titleLength === 0 || !imageUrl.trim()

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || isSubmitting) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty, isSubmitting])

  /**
   * 处理图片选择
   */
  const handleImageSelect = (materials: AdminMediaAsset[]) => {
    if (materials.length > 0) {
      const selectedMaterial = materials[0]
      setImageUrl(selectedMaterial.url ?? '')
      setImagePickerOpen(false)
      // 清除图片相关的错误
      setErrors((prev) => {
        const next = { ...prev }
        delete next.imageUrl
        return next
      })
    }
  }

  /**
   * 处理移除图片
   */
  const handleRemoveImage = () => {
    setImageUrl('')
    setErrors((prev) => ({ ...prev, imageUrl: '请选择图片' }))
  }

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = '标题不能为空'
    } else if (title.trim().length > 100) {
      newErrors.title = '标题最多100字符'
    }

    if (!imageUrl.trim()) {
      newErrors.imageUrl = '请选择图片'
    }

    if (link.trim() && !(link.startsWith('/') || /^https?:\/\//i.test(link.trim()))) {
      newErrors.link = '链接格式不正确，请填写 /path 或 http(s):// 开头的地址'
    }

    if (sortOrder && isNaN(parseInt(sortOrder, 10))) {
      newErrors.sortOrder = '排序必须是数字'
    } else if (parseInt(sortOrder || '0', 10) < 0) {
      newErrors.sortOrder = '排序不能小于 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/v1/admin/miniprogram/carousels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          imageUrl: imageUrl.trim(),
          link: link.trim() || null,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
        }),
      })

      if (!res.ok) {
        let errorMessage = res.statusText || '请求失败'
        try {
          const json = (await res.json()) as ApiResponse<unknown>
          if (!json.success) errorMessage = json.error?.message || '请求失败'
        } catch {
          // ignore
        }
        throw new Error(errorMessage)
      }

      const json = (await res.json()) as ApiResponse<{ id: string }>

      if (!json.success) {
        throw new Error(json.error?.message || '创建失败')
      }

      toast({
        title: '创建成功',
        description: '轮播图已创建',
        variant: 'default',
      })

      // 跳转到编辑页面或列表页
      router.push(`/admin/miniprogram/carousels/${json.data.id}/edit`)
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * 处理取消
   */
  const handleCancel = () => {
    if (isSubmitting) {
      return
    }
    if (isDirty && !window.confirm('当前表单有未保存内容，确定离开吗？')) {
      return
    }
    router.back()
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">创建轮播图</h1>
          <p className="text-muted-foreground mt-2">
            为小程序首页创建新的轮播图
          </p>
        </div>
      </div>

      {/* 表单卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>轮播图信息</CardTitle>
          <CardDescription>填写轮播图的基本信息和展示内容</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {hasValidationError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>表单存在未通过校验的字段，请检查后再提交。</p>
              </div>
            ) : null}

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="请输入轮播图标题"
                value={title}
                maxLength={100}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setErrors((prev) => {
                    if (!prev.title) return prev
                    const next = { ...prev }
                    delete next.title
                    return next
                  })
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.title)}
                aria-describedby="title-helper"
              />
              <div id="title-helper" className="flex items-center justify-between text-xs text-muted-foreground">
                <span>建议使用清晰标题，便于运营管理</span>
                <span>{titleLength}/100</span>
              </div>
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* 图片 */}
            <div className="space-y-2">
              <Label htmlFor="image">
                图片 <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* 图片预览 */}
                <div className="relative aspect-15/8 w-full max-w-md overflow-hidden rounded-md border bg-muted sm:w-64">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt="预览"
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <span className="text-sm">暂无图片</span>
                    </div>
                  )}
                </div>

                {/* 图片选择按钮 */}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImagePickerOpen(true)}
                    disabled={isSubmitting}
                  >
                    选择图片
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                    >
                      移除图片
                    </Button>
                  )}
                </div>
              </div>
              {errors.imageUrl && (
                <p className="text-sm text-destructive">{errors.imageUrl}</p>
              )}
              <p className="text-sm text-muted-foreground">
                建议尺寸：750x400 像素，支持 JPG、PNG 格式
              </p>
            </div>

            {/* 跳转链接 */}
            <div className="space-y-2">
              <Label htmlFor="link">跳转链接（可选）</Label>
              <Input
                id="link"
                placeholder="例如：/products/detail 或完整的 URL"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value)
                  setErrors((prev) => {
                    if (!prev.link) return prev
                    const next = { ...prev }
                    delete next.link
                    return next
                  })
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.link)}
              />
              {errors.link && (
                <p className="text-sm text-destructive">{errors.link}</p>
              )}
              <p className="text-sm text-muted-foreground">
                用户点击轮播图时跳转的页面链接，留空则不跳转
              </p>
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                placeholder="0"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value)
                  setErrors((prev) => {
                    if (!prev.sortOrder) return prev
                    const next = { ...prev }
                    delete next.sortOrder
                    return next
                  })
                }}
                disabled={isSubmitting}
                inputMode="numeric"
                aria-invalid={Boolean(errors.sortOrder)}
              />
              <p className="text-sm text-muted-foreground">
                数值越小越靠前，默认为 0
              </p>
              {errors.sortOrder && (
                <p className="text-sm text-destructive">{errors.sortOrder}</p>
              )}
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">启用状态</Label>
                <p className="text-sm text-muted-foreground">
                  禁用后轮播图将不会在小程序端显示
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSubmitting}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center">
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 素材选择器 */}
      <MaterialPicker
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={handleImageSelect}
        multiple={false}
        typeFilter={['image']}
      />
    </div>
  )
}
