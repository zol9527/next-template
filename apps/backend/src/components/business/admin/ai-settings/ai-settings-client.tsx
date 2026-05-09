'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, History, RotateCcw, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AiProviderConfigRequest } from '@/contracts/ai-settings.dto'

// ==================== 类型定义 ====================

interface ProviderConfig {
  provider: string
  baseUrl: string
  apiKey: string
  textModel: string
  imageModel: string
  isConfigured: boolean
}

interface TemplateItem {
  slug: string
  name: string
  category: string
  version: number
  isActive: boolean
  variables: string[]
  createdAt: string
}

interface TemplateDetail {
  slug: string
  name: string
  category: string
  content: string
  variables: string[]
  version: number
  isActive: boolean
  createdAt: string
}

interface TemplateVersion {
  version: number
  name: string
  content: string
  isActive: boolean
  createdAt: string
}

interface UsageStats {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  byProvider: Array<{ provider: string; calls: number; cost: number }>
  byCapability: Array<{ capability: string; calls: number; cost: number }>
}

/**
 * Function: fetchApi
 *
 * Description: 统一 API 请求封装，处理错误和类型转换
 *
 * Parameters:
 *     url(string): API 路径
 *     options(RequestInit): fetch 选项
 *
 * Returns:
 *     T: 成功时的 data 字段内容
 */
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options })
  if (!res.ok) throw new Error(`请求失败: ${res.statusText}`)
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success) throw new Error(json.error.message)
  return json.data
}

export function AiSettingsClient() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ==================== Provider 配置 ====================

  const { data: providerConfig, isLoading: isLoadingProvider } = useQuery<ProviderConfig>({
    queryKey: ['admin', 'ai', 'provider'],
    queryFn: () => fetchApi<ProviderConfig>('/api/v1/admin/ai/settings/provider'),
  })

  const [providerForm, setProviderForm] = React.useState<AiProviderConfigRequest>({
    provider: 'minimax',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    textModel: 'MiniMax-Text-01',
    imageModel: 'image-01',
  })

  // 从 API 响应同步表单初始值（保留脱敏 apiKey 作为 placeholder）
  React.useEffect(() => {
    if (providerConfig) {
      setProviderForm({
        provider: providerConfig.provider || 'minimax',
        baseUrl: providerConfig.baseUrl || 'https://api.minimax.chat/v1',
        apiKey: '', // 不回填密钥，保留空让用户重新输入
        textModel: providerConfig.textModel || 'MiniMax-Text-01',
        imageModel: providerConfig.imageModel || 'image-01',
      })
    }
  }, [providerConfig])

  const updateProviderMutation = useMutation({
    mutationFn: (data: AiProviderConfigRequest) =>
      fetchApi<ProviderConfig>('/api/v1/admin/ai/settings/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'provider'] })
      toast({ title: '保存成功', description: 'Provider 配置已更新' })
    },
    onError: (error: Error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' })
    },
  })

  // ==================== Prompt 模板 ====================

  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery<{ items: TemplateItem[] }>({
    queryKey: ['admin', 'ai', 'templates'],
    queryFn: () => fetchApi<{ items: TemplateItem[] }>('/api/v1/admin/ai/templates'),
  })

  const [selectedTemplateSlug, setSelectedTemplateSlug] = React.useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  const { data: templateDetail } = useQuery<TemplateDetail>({
    queryKey: ['admin', 'ai', 'template', selectedTemplateSlug],
    queryFn: () => fetchApi<TemplateDetail>(`/api/v1/admin/ai/templates/${selectedTemplateSlug}`),
    enabled: !!selectedTemplateSlug,
  })

  const { data: versionHistory } = useQuery<{ items: TemplateVersion[] }>({
    queryKey: ['admin', 'ai', 'template', 'versions', selectedTemplateSlug],
    queryFn: () => fetchApi<{ items: TemplateVersion[] }>(`/api/v1/admin/ai/templates/${selectedTemplateSlug}/versions`),
    enabled: !!selectedTemplateSlug && versionDialogOpen,
  })

  const [newVersionContent, setNewVersionContent] = React.useState('')

  const createVersionMutation = useMutation({
    mutationFn: (data: { slug: string; body: { name: string; category: string; content: string; variables: string[] } }) =>
      fetchApi<unknown>(`/api/v1/admin/ai/templates/${data.slug}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'template', selectedTemplateSlug] })
      toast({ title: '创建成功', description: '模板新版本已创建' })
      setEditDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: (data: { slug: string; targetVersion: number }) =>
      fetchApi<unknown>(`/api/v1/admin/ai/templates/${data.slug}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: data.targetVersion }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'template', selectedTemplateSlug] })
      toast({ title: '回滚成功', description: '模板已回滚到指定版本' })
    },
    onError: (error: Error) => {
      toast({ title: '回滚失败', description: error.message, variant: 'destructive' })
    },
  })

  // ==================== 使用统计 ====================

  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  const { data: statsData, isLoading: isLoadingStats } = useQuery<UsageStats>({
    queryKey: ['admin', 'ai', 'stats', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      return fetchApi<UsageStats>(`/api/v1/admin/ai/stats?${params.toString()}`)
    },
  })

  // ==================== 渲染 ====================

  const templates = templatesData?.items ?? []

  return (
    <AdminPageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">AI 设置</h1>
          <p className="text-sm text-muted-foreground">管理 AI Provider 配置、Prompt 模板和使用统计</p>
        </div>

        <Tabs defaultValue="provider" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="provider">Provider 配置</TabsTrigger>
            <TabsTrigger value="templates">Prompt 模板</TabsTrigger>
            <TabsTrigger value="stats">使用统计</TabsTrigger>
          </TabsList>

          {/* ==================== Provider 配置 Tab ==================== */}
          <TabsContent value="provider" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Provider 配置</CardTitle>
                    <CardDescription>配置 MiniMax AI Provider 的 API 设置</CardDescription>
                  </div>
                  {providerConfig?.isConfigured && (
                    <Badge variant="default">已配置</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProvider ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Provider</Label>
                        <Badge variant="secondary" className="w-full justify-center py-2">MiniMax</Badge>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="base-url">Base URL</Label>
                        <Input
                          id="base-url"
                          value={providerForm.baseUrl}
                          onChange={(e) => setProviderForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                          placeholder="https://api.minimax.chat/v1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={providerForm.apiKey}
                          onChange={(e) => setProviderForm(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={providerConfig?.apiKey || 'sk-****xxxx'}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="text-model">文本模型</Label>
                        <Input
                          id="text-model"
                          value={providerForm.textModel}
                          onChange={(e) => setProviderForm(prev => ({ ...prev, textModel: e.target.value }))}
                          placeholder="MiniMax-Text-01"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="image-model">图像模型</Label>
                        <Input
                          id="image-model"
                          value={providerForm.imageModel}
                          onChange={(e) => setProviderForm(prev => ({ ...prev, imageModel: e.target.value }))}
                          placeholder="image-01"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => updateProviderMutation.mutate(providerForm)}
                        disabled={updateProviderMutation.isPending}
                      >
                        {updateProviderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存配置
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 连接状态提示 */}
            <Card className={providerConfig?.isConfigured ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  {providerConfig?.isConfigured
                    ? 'Provider 已配置。修改 API Key 时请输入完整的密钥，保存后将自动加密存储。'
                    : 'Provider 尚未配置，请填写 API Key 并保存以启用 AI 功能。'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Prompt 模板 Tab ==================== */}
          <TabsContent value="templates" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt 模板管理</CardTitle>
                <CardDescription>管理 AI Prompt 模板，支持版本控制和回滚</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>暂无模板数据</p>
                    <p className="text-xs mt-1">请先运行种子数据初始化模板</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>分类</TableHead>
                        <TableHead>版本</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>变量</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((t: TemplateItem) => (
                        <TableRow key={t.slug}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell>v{t.version}</TableCell>
                          <TableCell>
                            <Badge variant={t.isActive ? 'default' : 'secondary'}>
                              {t.isActive ? '活跃' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.variables.map((v: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplateSlug(t.slug)
                                  setDetailDialogOpen(true)
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> 查看
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplateSlug(t.slug)
                                  setVersionDialogOpen(true)
                                }}
                              >
                                <History className="h-3.5 w-3.5 mr-1" /> 版本
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplateSlug(t.slug)
                                  setNewVersionContent(templateDetail?.content || '')
                                  setEditDialogOpen(true)
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" /> 编辑
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 模板详情 Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{templateDetail?.name || '模板详情'}</DialogTitle>
                  <DialogDescription>
                    {templateDetail?.category} · v{templateDetail?.version} · {templateDetail?.isActive ? '活跃' : '停用'}
                  </DialogDescription>
                </DialogHeader>
                {templateDetail && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <Label className="text-sm font-medium">模板内容</Label>
                      <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                        {templateDetail.content}
                      </pre>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">变量列表</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {templateDetail.variables.map((v: string, i: number) => (
                          <Badge key={i} variant="outline">{`{{${v}}}`}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* 版本历史 Dialog */}
            <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>版本历史</DialogTitle>
                  <DialogDescription>{selectedTemplateSlug} 的版本历史记录</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 max-h-96 overflow-auto">
                  {versionHistory?.items.map((v: TemplateVersion) => (
                    <div
                      key={v.version}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={v.isActive ? 'default' : 'secondary'}>v{v.version}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        {v.isActive && <Badge variant="outline" className="text-xs">当前</Badge>}
                      </div>
                      {!v.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rollbackMutation.isPending}
                          onClick={() => {
                            if (selectedTemplateSlug) {
                              rollbackMutation.mutate({ slug: selectedTemplateSlug, targetVersion: v.version })
                            }
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> 回滚
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* 编辑新版本 Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建新版本</DialogTitle>
                  <DialogDescription>编辑模板内容以创建新版本</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>模板内容</Label>
                    <Textarea
                      value={newVersionContent}
                      onChange={(e) => setNewVersionContent(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                      placeholder="输入模板内容，使用 {{变量名}} 进行变量插值..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                  <Button
                    disabled={createVersionMutation.isPending || !newVersionContent.trim()}
                    onClick={() => {
                      if (selectedTemplateSlug && templateDetail) {
                        // 从内容中提取 {{变量}} 列表
                        const variableMatches = newVersionContent.match(/\{\{(\w+)\}\}/g) || []
                        const variables = [...new Set(variableMatches.map(m => m.replace(/[{}]/g, '')))]
                        createVersionMutation.mutate({
                          slug: selectedTemplateSlug,
                          body: {
                            name: templateDetail.name,
                            category: templateDetail.category,
                            content: newVersionContent,
                            variables,
                          },
                        })
                      }
                    }}
                  >
                    {createVersionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    创建版本
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ==================== 使用统计 Tab ==================== */}
          <TabsContent value="stats" className="flex flex-col gap-6">
            {/* 日期筛选 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="start-date">开始日期</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="end-date">结束日期</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 概览卡片 */}
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : statsData ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总调用次数</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{statsData.totalCalls.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>输入 Tokens</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{statsData.totalInputTokens.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>输出 Tokens</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{statsData.totalOutputTokens.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总费用 (CNY)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">¥ {statsData.totalCost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 按 Provider 统计 */}
                {statsData.byProvider.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>按 Provider 统计</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>调用次数</TableHead>
                            <TableHead>费用 (CNY)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.byProvider.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{p.provider}</TableCell>
                              <TableCell>{p.calls.toLocaleString()}</TableCell>
                              <TableCell>¥ {p.cost.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* 按能力类型统计 */}
                {statsData.byCapability.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>按能力类型统计</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>能力类型</TableHead>
                            <TableHead>调用次数</TableHead>
                            <TableHead>费用 (CNY)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.byCapability.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{c.capability}</TableCell>
                              <TableCell>{c.calls.toLocaleString()}</TableCell>
                              <TableCell>¥ {c.cost.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>暂无统计数据</p>
                    <p className="text-xs mt-1">使用 AI 功能后将自动生成统计信息</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageLayout>
  )
}
