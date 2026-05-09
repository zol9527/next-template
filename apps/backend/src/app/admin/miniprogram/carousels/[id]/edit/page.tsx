'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import {
  MaterialPicker,
} from '@/components/business/admin/media/material-picker'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { useQuery } from '@tanstack/react-query'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

/**
 * 轮播图数据类型（临时定义，后续应从 DTO 导入）
 */
interface Carousel {
  id: string
  title: string
  imageUrl: string
  link: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 轮播图编辑页面
 * 加载现有数据并支持编辑
 */
export default function EditCarouselPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const carouselId = params.id as string

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

  /**
   * 获取轮播图详情
   */
  const { data: carouselData, isLoading: loading } = useQuery<Carousel>({
    queryKey: ['admin', 'miniprogram', 'carousels', carouselId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/miniprogram/carousels/${carouselId}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch carousel: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<Carousel>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
  })

  /**
   * 当轮播图详情加载成功后，初始化表单状态
   */
  useEffect(() => {
    if (carouselData) {
      setTitle(carouselData.title)
      setLink(carouselData.link || '')
      setSortOrder(carouselData.sortOrder.toString())
      setIsActive(carouselData.isActive)
      setImageUrl(carouselData.imageUrl)
    }
  }, [carouselData])

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
  }

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = '标题不能为空'
    }

    if (!imageUrl.trim()) {
      newErrors.imageUrl = '请选择图片'
    }

    if (sortOrder && isNaN(parseInt(sortOrder, 10))) {
      newErrors.sortOrder = '排序必须是数字'
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
      const res = await fetch(`/api/v1/admin/miniprogram/carousels/${carouselId}`, {
        method: 'PUT',
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

      const json = (await res.json()) as ApiResponse<Carousel>

      if (!json.success) {
        throw new Error(json.error?.message || '更新失败')
      }

      toast({
        title: '保存成功',
        description: '轮播图已更新',
        variant: 'default',
      })

      // 刷新数据
      router.refresh()
    } catch (error) {
      toast({
        title: '保存失败',
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
    router.back()
  }

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight">编辑轮播图</h1>
          <p className="text-muted-foreground mt-2">
            修改轮播图的信息和展示内容
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
            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="请输入轮播图标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* 图片 */}
            <div className="space-y-2">
              <Label htmlFor="image">
                图片 <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-start gap-4">
                {/* 图片预览 */}
                <div className="relative h-40 w-64 rounded-md overflow-hidden bg-muted border">
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
                    更换图片
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
                onChange={(e) => setLink(e.target.value)}
                disabled={isSubmitting}
              />
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
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isSubmitting}
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
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
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
