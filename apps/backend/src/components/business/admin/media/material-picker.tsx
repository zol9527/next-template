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
  CheckCircle2,
  Loader2,
  LayoutGrid,
  Upload,
} from 'lucide-react'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import { cn } from '@/lib/utils'
import { FILE_INPUT_ACCEPT_VALUE } from '@/lib/constants/file-types'
import { useToast } from '@/components/ui/toast'
import { Progress } from '@/components/ui/progress'
import { useAdminMediaAssets } from '@/components/context/admin-media-assets-context'
import { MediaGridCard } from './media-grid-card'

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

Description: 通用的媒体素材选择器弹窗，基于设计系统 CSS 变量和新 MediaGridCard 组件。
             支持分页、搜索、过滤，并提供单选/多选模式。集成直接上传功能。

Parameters:
    open(boolean): 弹窗是否打开
    onOpenChange(function): 弹窗打开状态变更回调
    onSelect(function): 选择完成后的回调，返回所选资产的数组
    multiple(boolean): 是否支持多选，默认 false
    typeFilter(string[]): 媒体类型过滤，如 ['image', 'video']

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showOverlay={showOverlay}
        disableAnimation={disableAnimation}
        className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden border-none"
        style={{
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-modal)',
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-dropdown-content]') || target.closest('[role="dialog"]')) {
            e.preventDefault()
            return
          }
        }}
      >
        {/* 头部 - 使用 CSS 变量 */}
        <DialogHeader
          className="flex flex-row items-center justify-between space-y-0 shrink-0 px-6 py-4"
          style={{
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5"
              style={{
                backgroundColor: 'var(--ds-accent-subtle)',
                borderRadius: 'var(--radius-md, 12px)',
                color: 'var(--ds-accent)',
              }}
            >
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--fg)' }}
              >
                媒体素材库
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {activeTab === 'upload' ? '上传新素材到云端存储' : '选择媒体文件或上传新素材'}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 搜索栏 + Tab 切换 - 使用 CSS 变量 */}
        <div
          className="px-5 py-3 flex flex-wrap items-center gap-3"
          style={{
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-alt, rgba(0,0,0,0.01))',
          }}
        >
          {/* 搜索输入框 - 使用 CSS 变量 */}
          <div className="relative flex-1 min-w-50">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: 'var(--fg-muted)' }}
            />
            <Input
              placeholder="搜索素材名称..."
              className="pl-9 h-9 text-sm"
              style={{
                borderColor: 'var(--border)',
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query.listQuery.refetch()}
              disabled={activeTab === 'upload'}
            />
          </div>

          {/* Tab 按钮组 - 使用 CSS 变量 */}
          <div
            className="flex items-center gap-1 p-0.5"
            style={{
              backgroundColor: 'var(--surface-alt, rgba(0,0,0,0.02))',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            {([
              { key: 'all' as const, label: '全部' },
              { key: 'image' as const, label: '图片' },
              { key: 'video' as const, label: '视频' },
            ]).map(({ key, label }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[11px] transition-all"
                style={activeTab === key ? {
                  backgroundColor: 'var(--ds-accent)',
                  color: '#ffffff',
                } : {
                  color: 'var(--fg-muted)',
                }}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* 上传按钮 */}
          <Button
            variant={activeTab === 'upload' ? 'secondary' : 'outline'}
            className={cn(
              "h-9 px-3 gap-1.5 border-dashed transition-all text-xs",
            )}
            style={activeTab === 'upload' ? {
              backgroundColor: 'var(--ds-accent-subtle)',
              color: 'var(--ds-accent)',
              borderColor: 'var(--ds-accent)',
            } : {
              borderColor: 'var(--border)',
            }}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="h-3.5 w-3.5" />
            上传素材
          </Button>
        </div>

        {/* 主内容区 */}
        <ScrollArea className="flex-1" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="p-5">
            {activeTab === 'upload' ? (
              /* 上传标签页 - 使用 CSS 变量 */
              <div className="h-[45vh] w-full flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "w-full max-w-xl min-w-[18rem] aspect-video border-2 border-dashed transition-all flex flex-col items-center justify-center gap-5 cursor-pointer group",
                  )}
                  style={{
                    borderRadius: 'var(--radius-lg, 16px)',
                    borderColor: dragOver ? 'var(--ds-accent)' : 'var(--border-medium)',
                    backgroundColor: dragOver ? 'var(--ds-accent-subtle)' : 'var(--surface-alt, rgba(0,0,0,0.01))',
                  }}
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
                          <Loader2
                            className="h-14 w-14 animate-spin"
                            style={{ color: 'var(--fg-muted)' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload
                              className="h-5 w-5 animate-bounce"
                              style={{ color: 'var(--ds-accent)' }}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <h3 className="text-base font-bold" style={{ color: 'var(--fg)' }}>正在上传素材...</h3>
                          <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>请勿关闭窗口，正在同步到云端存储</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span style={{ color: 'var(--ds-accent)' }}>PROGRESS</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1.5" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="p-6 rounded-full group-hover:scale-110 transition-transform duration-500"
                        style={{
                          backgroundColor: 'var(--ds-accent-subtle)',
                          color: 'var(--ds-accent)',
                          boxShadow: '0 0 0 24px var(--ds-accent-subtle)',
                        }}
                      >
                        <Upload className="h-10 w-10" />
                      </div>
                      <div className="w-full max-w-md px-6 text-center space-y-2">
                        <h3 className="text-base font-bold tracking-tight break-normal" style={{ color: 'var(--fg)' }}>
                          点击或拖拽文件至此处上传
                        </h3>
                        <p className="text-xs break-normal" style={{ color: 'var(--fg-muted)' }}>
                          支持 JPG, PNG, WEBP, MP4 等格式，单个文件最大 100MB
                        </p>
                      </div>
                      <Button
                        className="px-6 h-10 text-sm font-bold shadow-xl"
                        style={{
                          backgroundColor: 'var(--ds-accent)',
                          color: '#ffffff',
                          boxShadow: '0 10px 15px -3px rgba(245, 78, 0, 0.4)',
                        }}
                      >
                        选择本地文件
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : query.listQuery.isLoading ? (
              /* 加载状态 */
              <div
                className="h-[40vh] flex flex-col items-center justify-center gap-3"
                style={{ color: 'var(--fg-muted)' }}
              >
                <div className="relative">
                  <Loader2
                    className="h-10 w-10 animate-spin"
                    style={{ color: 'var(--fg-muted)', opacity: 0.4 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4" style={{ color: 'var(--ds-accent)' }} />
                  </div>
                </div>
                <p className="text-xs font-medium animate-pulse">正在调取素材库资源...</p>
              </div>
            ) : items.length === 0 ? (
              /* 空状态 */
              <div
                className="h-[40vh] flex flex-col items-center justify-center gap-3"
                style={{ color: 'var(--fg-muted)' }}
              >
                <div
                  className="p-5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface-alt, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border)',
                    opacity: 0.5,
                  }}
                >
                  <ImageIcon className="h-12 w-12" style={{ opacity: 0.3 }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>未找到匹配的媒体文件</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>尝试更换搜索词或上传新素材</p>
                </div>
              </div>
            ) : (
              /* 媒体网格 - 使用 MediaGridCard + 选中覆盖层 */
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                style={{ gap: 'var(--space-4, 16px)' }}
              >
                {items.map((asset) => {
                  const isSelected = selectedIds.has(asset.id)

                  return (
                    <div key={asset.id} className="relative">
                      {/* MediaGridCard: 只处理渲染和 detail 点击，选中由外层 wrapper 控制 */}
                      <MediaGridCard
                        asset={asset}
                        selected={isSelected}
                        onSelect={() => toggleSelect(asset)}
                      />

                      {/* 选中高亮覆盖层: ring-2 + 右上角 CheckCircle2 */}
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 z-10 flex items-center justify-center animate-in zoom-in duration-200"
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--ds-accent)',
                            color: '#ffffff',
                            boxShadow: 'var(--shadow-hover)',
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部操作栏 - 使用 CSS 变量 */}
        <DialogFooter
          className="px-5 py-4 flex flex-row items-center justify-between gap-3 shrink-0"
          style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1.5"
              style={{
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: 'var(--surface-alt, rgba(0,0,0,0.02))',
                border: '1px solid var(--border)',
              }}
            >
              <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                {selectedIds.size > 0 ? (
                  <span style={{ color: 'var(--ds-accent)' }} className="font-semibold">
                    已选中 {selectedIds.size} 个素材
                  </span>
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
              className="h-9 px-5 text-xs font-medium transition-all"
              style={{
                borderRadius: 'var(--radius-sm, 8px)',
                borderColor: 'var(--border)',
              }}
            >
              取消
            </Button>
            <Button
              disabled={selectedIds.size === 0 || activeTab === 'upload'}
              onClick={handleConfirm}
              className="h-9 px-5 gap-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              style={{
                backgroundColor: 'var(--ds-accent)',
                color: '#ffffff',
                borderRadius: 'var(--radius-sm, 8px)',
                boxShadow: '0 8px 20px rgba(245, 78, 0, 0.3)',
              }}
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
