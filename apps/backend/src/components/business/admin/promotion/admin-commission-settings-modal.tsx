'use client'

import * as React from 'react'
import { Loader2, Settings, Percent, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'

interface LevelConfig {
  id: string
  level: number
  name: string
  commissionRate: string
  minSalesCount: number
  minSalesAmount: string
  description: string
}

interface CommissionSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CommissionSettingsModal({ open, onOpenChange, onSuccess }: CommissionSettingsModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [levels, setLevels] = React.useState<LevelConfig[]>([])
  const [saving, setSaving] = React.useState(false)
  const [modifiedIds, setModifiedIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (!open) return
    const fetchLevels = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/v1/admin/promoter-levels', {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch levels')
        const json = (await res.json()) as ApiResponse<{ levels: PromoterLevel[] }>
        if (json.success) {
          setLevels(
            json.data.levels.map((l) => ({
              id: l.id,
              level: l.level,
              name: l.name,
              commissionRate: l.commissionRate,
              minSalesCount: l.minSalesCount,
              minSalesAmount: l.minSalesAmount,
              description: l.description ?? '',
            }))
          )
        }
      } catch (_error) {
        toast({ title: '加载失败', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    void fetchLevels()
  }, [open, toast])

  const handleValueChange = (levelId: string, field: keyof LevelConfig, value: string | number) => {
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, [field]: value } : l))
    )
    setModifiedIds((prev) => new Set(prev).add(levelId))
  }

  const handleSave = async () => {
    const modifiedLevels = levels.filter((l) => modifiedIds.has(l.id))
    if (modifiedLevels.length === 0) {
      toast({ title: '提示', description: '没有修改的内容' })
      return
    }

    setSaving(true)
    try {
      for (const level of modifiedLevels) {
        const res = await fetch(`/api/v1/admin/promoter-levels/${level.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            commissionRate: level.commissionRate,
            minSalesAmount: level.minSalesAmount,
            minSalesCount: level.minSalesCount,
            reason: level.description,
          }),
        })
        if (!res.ok) {
          throw new Error(`Failed to update ${level.name}`)
        }
      }
      toast({ title: '成功', description: '佣金比例已更新' })
      setModifiedIds(new Set())
      onSuccess()
      onOpenChange(false)
    } catch (_error) {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'from-muted-foreground/40 to-muted-foreground/50',
      2: 'from-info to-info/80',
      3: 'from-warning to-warning/80',
      4: 'from-primary to-primary/80',
    }
    return colors[level] || colors[1]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            佣金比例设置
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {levels.map((level) => (
              <div
                key={level.id}
                className={cn(
                  'border p-4 transition-all',
                  modifiedIds.has(level.id) && 'border-primary bg-primary/5'
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold', getLevelColor(level.level))}>
                    {level.level}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{level.name}</div>
                    <div className="text-sm text-muted-foreground">{level.description}</div>
                  </div>
                  {modifiedIds.has(level.id) && (
                    <span className="text-xs text-primary">已修改</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">佣金比例</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={level.commissionRate}
                        onChange={(e) => handleValueChange(level.id, 'commissionRate', e.target.value)}
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(parseFloat(level.commissionRate) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">最低订单数</label>
                    <Input
                      type="number"
                      min="0"
                      value={level.minSalesCount}
                      onChange={(e) => handleValueChange(level.id, 'minSalesCount', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">最低销售额</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                      <Input
                        type="number"
                        min="0"
                        value={level.minSalesAmount}
                        onChange={(e) => handleValueChange(level.id, 'minSalesAmount', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || modifiedIds.size === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CommissionSettingsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Settings className="h-4 w-4" />
      佣金设置
    </Button>
  )
}
