'use client'

/**
 * File: src/app/admin/mfa-settings/page.tsx
 * Description: MFA 策略配置管理页面 - 优化布局和间距设计
 */

import { Shield, ShieldCheck, ShieldAlert, Lock, Key } from 'lucide-react'
import { MfaGlobalSettingsCard } from '@/components/business/admin/mfa-settings/mfa-global-settings-card'
import { MfaRolePolicyTable } from '@/components/business/admin/mfa-settings/mfa-role-policy-table'
import { MfaExemptionList } from '@/components/business/admin/mfa-settings/mfa-exemption-list'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/ui/admin-tabs'
import { useQuery } from '@tanstack/react-query'
import type { MfaSettingsResponse } from '@/contracts/dtos/admin/mfa-settings.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Loading State Component
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-16 w-16 text-primary/20 animate-pulse" />
        </div>
        <Lock className="h-16 w-16 text-primary relative z-10" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">加载安全设置中...</h3>
        <p className="text-sm text-muted-foreground">正在获取 MFA 策略配置</p>
      </div>
    </div>
  )
}

/**
 * Error State Component
 */
function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="mb-6 rounded-full bg-destructive/10 p-6">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-destructive">加载失败</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}

/**
 * Page Header Component
 */
function PageHeader() {
  return (
    <div className="mb-8 space-y-4">
      {/* Header with visual accent */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-info/5 p-8">
        <div className="relative flex items-start gap-6">
          {/* Decorative icon */}
          <div className="hidden sm:block">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 shadow-xl">
              <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-primary" strokeWidth={2} />
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  MFA 策略配置
                </h1>
              </div>
              <p className="text-base text-muted-foreground max-w-2xl">
                管理多因素认证策略，包括全局设置、角色策略和用户豁免。配置 MFA 策略以增强账户安全性。
              </p>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                <Shield className="h-3 w-3 mr-1.5 text-info" strokeWidth={2.5} />
                全局策略
              </div>
              <div className="inline-flex items-center rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                <Lock className="h-3 w-3 mr-1.5 text-primary" strokeWidth={2.5} />
                角色策略
              </div>
              <div className="inline-flex items-center rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                <ShieldAlert className="h-3 w-3 mr-1.5 text-warning" strokeWidth={2.5} />
                豁免管理
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MfaSettingsPage() {
  // 获取 MFA 设置数据
  const { data: settingsData, isLoading, error } = useQuery<MfaSettingsResponse>({
    queryKey: ['admin', 'mfa', 'settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/mfa/settings', { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Failed to fetch MFA settings: ${res.statusText}`)
      }
      const json = await res.json() as ApiResponse<MfaSettingsResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    staleTime: 1 * 60 * 1000, // 1 分钟内数据视为新鲜
    retry: 1,
  })

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />

  const settings = settingsData!

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <PageHeader />

      {/* MFA 设置标签页 - 优化 Tab 宽度 */}
      <AdminTabs defaultValue="global" className="space-y-6">
        <AdminTabsList>
          <AdminTabsTrigger value="global" className="gap-2">
            <Shield className="h-4 w-4" />
            全局设置
          </AdminTabsTrigger>
          <AdminTabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            角色策略
          </AdminTabsTrigger>
          <AdminTabsTrigger value="exemptions" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            豁免用户
          </AdminTabsTrigger>
        </AdminTabsList>

        {/* 标签页内容区域 - 增加内边距和间距 */}
        <div className="space-y-6">
          {/* 全局设置标签页 */}
          <AdminTabsContent value="global" className="mt-6">
            <MfaGlobalSettingsCard settings={settings.global} />
          </AdminTabsContent>

          {/* 角色策略标签页 */}
          <AdminTabsContent value="roles" className="mt-6">
            <MfaRolePolicyTable
              policies={settings.roles}
              availableRoles={settings.availableRoles}
            />
          </AdminTabsContent>

          {/* 豁免用户标签页 */}
          <AdminTabsContent value="exemptions" className="mt-6">
            <MfaExemptionList exemptions={settings.exemptions} />
          </AdminTabsContent>
        </div>
      </AdminTabs>
    </div>
  )
}
