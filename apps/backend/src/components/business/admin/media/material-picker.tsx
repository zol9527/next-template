'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Loader2,
  FileIcon,
  Plus,
  LayoutGrid,
  Upload
} from 'lucide-react'
import Image from 'next/image'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import { cn } from '@/lib/utils'
import { FILE_INPUT_ACCEPT_VALUE } from '@/lib/constants/file-types'
import { useToast } from '@/components/ui/toast'
import { Progress } from '@/components/ui/progress'
import { useAdminMediaAssets } from '@/components/context/admin-media-assets-context'

/**
Function: getMediaAssetDisplayUrl

Description: 根据媒体资产的 provider 和 objectKey 生成显示 URL
             优先使用 API 返回的 url 字段（已包含签名 URL）

Parameters:
    asset(AdminMediaAsset): 媒体资产数据

Returns:
    url(string | null): 媒体访问 URL
*/
function getMediaAssetDisplayUrl(asset: AdminMediaAsset): string | null {
  // 优先使用 API 返回的 url 字段（对于云存储，已包含签名 URL）
  if (asset.url) {
    return asset.url
  }

  // 根据 provider 生成 URL（fallback，理论上不应该走到这里）
  switch (asset.provider) {
    case 'local':
      // 本地存储：使用统一的 public API 路径
      return `/api/v1/public/files/${asset.objectKey}`
    case 'aliyun_oss': {
      const uploadHost = process.env.NEXT_PUBLIC_ALIYUN_OSS_UPLOAD_HOST
      if (uploadHost) {
        return `${uploadHost}/${asset.objectKey}`
      }
      return `https://${asset.bucket}.oss-cn-hangzhou.aliyuncs.com/${asset.objectKey}`
    }
    case 'tencent_cos': {
      const uploadHost = process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST
      if (uploadHost) {
        return `${uploadHost}/${asset.objectKey}`
      }
      return `https://${asset.bucket}.cos.ap-guangzhou.myqcloud.com/${asset.objectKey}`
    }
    default:
      return asset.url
  }
}

const DEFAULT_TYPE_FILTER: string[] = []

interface MaterialPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (assets: AdminMediaAsset[]) => void
  multiple?: boolean
  typeFilter?: string[]
  showOverlay?: boolean
  disableAnimation?: boolean
}

/**
Function: MaterialPicker
<BLANK LINE>
Description: 通用的媒体素材选择器弹窗，采用与商品表单一致的玻璃拟态 UI。支持分页、搜索、过滤，并提供单选/多选模式。集成直接上传功能。
<BLANK LINE>
Parameters:
    open(boolean): 弹窗是否打开
    onOpenChange(function): 弹窗打开状态变更回调
    onSelect(function): 选择完成后的回调，返回所选资产的数组
    multiple(boolean): 是否支持多选，默认 false
    typeFilter(string[]): 媒体类型过滤，如 ['image', 'video']
<BLANK LINE>
Returns:
    element(React.ReactElement): 素材选择器 UI
*/
export function MaterialPicker({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  typeFilter = DEFAULT_TYPE_FILTER,
  showOverlay = true,
  disableAnimation = false,
}: MaterialPickerProps) {
  const { toast } = useToast()
  const { uploadAsset } = useAdminMediaAssets()
  const [search, setSearch] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = React.useState<'all' | 'image' | 'video' | 'upload'>('all')

  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [dragOver, setDragOver] = React.useState(false)

  // Memoize typeFilter to prevent infinite loops if passed as a literal array
  const typeFilterString = JSON.stringify(typeFilter)
  const stableTypeFilter = React.useMemo(() => JSON.parse(typeFilterString) as string[], [typeFilterString])

  const normalizedTypeFilter = React.useMemo(
    () => stableTypeFilter.filter((t): t is 'image' | 'video' => t === 'image' || t === 'video'),
    [stableTypeFilter],
  )

  const effectiveType = activeTab === 'all'
    ? normalizedTypeFilter
    : (activeTab === 'image' || activeTab === 'video')
      ? [activeTab]
      : []

  const query = useAdminMediaAssets({
    list: {
      cursor: null,
      pageSize: 30,
      sortOrder: 'desc',
      search,
      type: effectiveType,
      enabled: open && activeTab !== 'upload',
    },
  })

  const items = query.listQuery.data?.items ?? []
  const total = query.listQuery.data?.totalRecords ?? 0

  React.useEffect(() => {
    if (open) {
      if (activeTab !== 'upload') {
        setSelectedIds(new Set())
      }
    }
  }, [open, activeTab])

  const toggleSelect = (asset: AdminMediaAsset) => {
    const nextIds = new Set(selectedIds)
    if (nextIds.has(asset.id)) {
      nextIds.delete(asset.id)
    } else {
      if (!multiple) nextIds.clear()
      nextIds.add(asset.id)
    }
    setSelectedIds(nextIds)
  }

  const handleConfirm = () => {
    const selectedAssets = items.filter(item => selectedIds.has(item.id))
    onSelect(selectedAssets)
    onOpenChange(false)
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        await uploadAsset(file, {
          onProgress: (info) => setUploadProgress(info.percent),
        })
      }

      toast({ title: '上传成功', description: `已成功上传 ${files.length} 个文件` })
      setActiveTab('all')
      setSearch('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      toast({ title: '上传失败', description: message, variant: 'destructive' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getMediaIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <ImageIcon className="h-6 w-6" />
    if (contentType.startsWith('video/')) return <Video className="h-6 w-6" />
    return <FileIcon className="h-6 w-6" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showOverlay={showOverlay}
        disableAnimation={disableAnimation}
        className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-dropdown-content]') || target.closest('[data-dialog-content]')) {
            e.preventDefault()
            return
          }
        }}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b space-y-0 shrink-0 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary p-2.5 rounded-xl shadow-lg ring-1 ring-primary/30">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                媒体素材库
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {activeTab === 'upload' ? '上传新素材到云端存储' : '选择媒体文件或上传新素材'}
                </span>
              </div>
            </div>
          </div>

        </DialogHeader>

        <div className="px-5 py-3 border-b border-border/10 flex flex-wrap items-center gap-3 bg-muted/5 backdrop-blur-sm">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索素材名称..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query.listQuery.refetch()}
              disabled={activeTab === 'upload'}
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-muted/10 border border-border/10 rounded-lg">
            <Button
              variant={activeTab === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 px-3 text-[11px] transition-all", activeTab === 'all' && "bg-primary/20 text-primary hover:bg-primary/30")}
              onClick={() => setActiveTab('all')}
            >
              全部
            </Button>
            <Button
              variant={activeTab === 'image' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 px-3 text-[11px] transition-all", activeTab === 'image' && "bg-primary/20 text-primary hover:bg-primary/30")}
              onClick={() => setActiveTab('image')}
            >
              图片
            </Button>
            <Button
              variant={activeTab === 'video' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 px-3 text-[11px] transition-all", activeTab === 'video' && "bg-primary/20 text-primary hover:bg-primary/30")}
              onClick={() => setActiveTab('video')}
            >
              视频
            </Button>
          </div>

          <Button
            variant={activeTab === 'upload' ? 'secondary' : 'outline'}
            className={cn(
              "h-9 px-3 gap-1.5 border-dashed transition-all text-xs",
              activeTab === 'upload'
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border/20 hover:border-primary/50 hover:bg-primary/5"
            )}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="h-3.5 w-3.5" />
            上传素材
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-background/50">
          <div className="p-5">
            {activeTab === 'upload' ? (
              <div className="h-[45vh] w-full flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "w-full max-w-xl min-w-[18rem] aspect-video border-2 border-dashed transition-all flex flex-col items-center justify-center gap-5 cursor-pointer group rounded-xl",
                    dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/20 bg-muted/5 hover:border-border/30"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                  onClick={() => document.getElementById('picker-upload-input')?.click()}
                >
                  <input
                    id="picker-upload-input"
                    type="file"
                    multiple
                    accept={FILE_INPUT_ACCEPT_VALUE}
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />

                  {uploading ? (
                    <div className="w-full max-w-md space-y-5 px-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <Loader2 className="h-14 w-14 animate-spin text-primary/20" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-primary animate-bounce" />
                          </div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-base font-bold">正在上传素材...</h3>
                          <p className="text-xs text-muted-foreground mt-1">请勿关闭窗口，正在同步到云端存储</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-primary">PROGRESS</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1.5 bg-muted/5" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-6 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500 ring-6 ring-primary/5">
                        <Upload className="h-10 w-10" />
                      </div>
                      <div className="w-full max-w-md px-6 text-center space-y-2">
                        <h3 className="text-base font-bold tracking-tight break-normal">
                          点击或拖拽文件至此处上传
                        </h3>
                        <p className="text-xs text-muted-foreground break-normal">
                          支持 JPG, PNG, WEBP, MP4 等格式，单个文件最大 100MB
                        </p>
                      </div>
                      <Button className="px-6 h-10 text-sm font-bold shadow-xl shadow-primary/40">
                        选择本地文件
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : query.listQuery.isLoading ? (
              <div className="h-[40vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs font-medium animate-pulse">正在调取素材库资源...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="h-[40vh] flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
                <div className="p-5 rounded-full bg-muted/5 border border-border/10">
                  <ImageIcon className="h-12 w-12 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">未找到匹配的媒体文件</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/60">尝试更换搜索词或上传新素材</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map((asset) => {
                  const isSelected = selectedIds.has(asset.id)
                  const isImage = asset.contentType.startsWith('image/')
                  const displayUrl = getMediaAssetDisplayUrl(asset)

                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        "group relative aspect-square rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer bg-muted/5",
                        isSelected
                          ? "border-primary shadow-primary/20 ring-2 ring-primary/10"
                          : "border-border/10 hover:border-border/30 hover:shadow-lg"
                      )}
                      onClick={() => toggleSelect(asset)}
                    >
                      {isImage && displayUrl ? (
                        <Image
                          src={displayUrl}
                          alt={asset.objectKey}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-linear-to-br from-muted/5 to-muted/10">
                          <div className="p-2 border border-border/20 rounded-lg bg-muted/10">
                            {getMediaIcon(asset.contentType)}
                          </div>
                          <span className="text-[10px] font-medium opacity-30 uppercase tracking-wider">
                            {asset.contentType.split('/')[1]}
                          </span>
                        </div>
                      )}

                      {/* Overlay Info */}
                      <div className={cn(
                        "absolute inset-x-0 bottom-0 px-2 py-1.5 bg-card/80 backdrop-blur-md border-t border-border/20 transition-all duration-300 translate-y-full group-hover:translate-y-0",
                        isSelected && "translate-y-0 bg-primary/95"
                      )}>
                        <p className="text-[9px] font-medium text-white leading-tight" title={asset.objectKey}>
                          {asset.objectKey.split('/').pop()}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[8px] text-white/80 font-mono">
                            {(asset.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                          {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                        </div>
                      </div>

                      {/* Selection Indicator (Top Right) */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-white text-primary rounded-full p-0.5 shadow-md animate-in zoom-in duration-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}

                      {/* Hover Action */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/30">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 py-4 border-t border-border/10 bg-background/90 backdrop-blur-md flex flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-muted/5 border border-border/10">
              <span className="text-[11px] text-muted-foreground">
                {selectedIds.size > 0 ? (
                  <span className="text-primary font-semibold">已选中 {selectedIds.size} 个素材</span>
                ) : (
                  `库中共有 ${total} 个素材`
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-5 rounded-lg text-xs font-medium bg-muted/5 border-border/10 hover:bg-muted/20 transition-all"
            >
              取消
            </Button>
            <Button
              disabled={selectedIds.size === 0 || activeTab === 'upload'}
              onClick={handleConfirm}
              className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 gap-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              确认选择
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

