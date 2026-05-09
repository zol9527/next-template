'use client'

import * as React from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Info,
  Loader2,
  ShieldAlert,
  Activity,
  User as UserIcon,
  UserX,
  Calendar,
  Mail,
  Phone,
  Lock,
  Clock,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/avatar'
import type { AdminUserListItem as User } from '@/contracts/dtos/admin/users.dto'
import type { SafeAdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import { AdminUserDetailResponseSchema } from '@/contracts/dtos/admin/user-detail.dto'

interface UserDetailsSheetProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevoke?: () => void
  onUnlock?: () => void
  isUnlocking?: boolean
}

/**
 * Component: UserDetailsSheet
 *
 * Description: 显示用户详细安全和活动信息的侧边栏。
 * Refactored to provide robust error handling and clearer state management.
 */
export function UserDetailsSheet({
  user,
  open,
  onOpenChange,
  onRevoke,
  onUnlock,
  isUnlocking
}: UserDetailsSheetProps) {
  const { data: detail, isLoading: isLoadingDetail, error: detailError, refetch } = useQuery<SafeAdminUserDetail>({
    queryKey: ['admin', 'users', user?.id, 'detail'],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is missing')
      
      const res = await fetch(`/api/v1/admin/users/${user.id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || `请求失败 (${res.status})`)
      }
      
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error?.message || '请求失败')
      }
      
      const parsed = AdminUserDetailResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        console.error('Validation error:', parsed.error)
        throw new Error('响应数据格式不符合预期')
      }
      
      return parsed.data.user
    },
    enabled: !!user?.id && open,
    retry: 1
  })

  // Date formatter helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '未记录'
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '无效日期'
    }
  }

  // Render content based on state
  const renderContent = () => {
    if (isLoadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">正在加载用户详情...</span>
        </div>
      )
    }

    if (detailError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-2 ring-1 ring-destructive/20 relative group">
            <div className="absolute inset-0 bg-destructive/5 rounded-full animate-ping opacity-20" />
            <ShieldAlert className="h-9 w-9 text-destructive transition-transform group-hover:scale-110 duration-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">无法加载信息</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
              {detailError instanceof Error ? detailError.message : '获取用户详情时发生未知错误'}
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-w-24"
            >
              关闭
            </Button>
            <Button 
              variant="info" 
              onClick={() => refetch()}
              className="min-w-24 gap-2"
            >
              <Activity className="w-3.5 h-3.5" />
              重试
            </Button>
          </div>
        </div>
      )
    }

    if (!detail) {
      // Should technically not happen if success is true, but handles edge case
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">暂无数据</h3>
          <p className="text-sm text-muted-foreground/70 mb-4">未能找到该用户的详细信息</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      )
    }

    // Success State
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Header Card */}
        <div className="bg-card/40 backdrop-blur-md border border-border/10 shadow-lg rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative mb-5">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center text-foreground font-bold text-4xl ring-1 ring-border/10 shadow-2xl overflow-hidden">
              <Image
                src={getAvatarUrl({
                  avatarUrl: detail.avatarUrl,
                  userId: detail.id,
                  username: detail.username,
                })}
                alt={detail.username || 'User'}
                fill
                sizes="112px"
                className="object-cover"
              />
            </div>
            
            <div className={cn(
              "absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-[3px] border-card flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110",
              detail.status === 'active' ? "bg-success" : "bg-destructive"
            )}>
              {detail.status === 'active' ? (
                <UserIcon className="h-4 w-4 text-white" />
              ) : (
                <UserX className="h-4 w-4 text-white" />
              )}
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-1 tracking-tight">
            {detail.username || '未设置用户名'}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shadow-sm">
              {detail.userType || 'MEMBER'}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border border-border/10">
              ID: {detail.id.slice(0, 8)}...
            </span>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/5 backdrop-blur-sm border border-border/10 rounded-2xl p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground/60 mb-2">
              <Activity className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">账户状态</span>
            </div>
            <div className={cn(
              "text-lg font-bold capitalize flex items-center gap-2",
              detail.status === 'active' ? "text-success" : "text-destructive"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full shadow-[0_0_8px]",
                detail.status === 'active' 
                  ? "bg-success shadow-success/50 animate-pulse" 
                  : "bg-destructive shadow-destructive/50"
              )} />
              {detail.status === 'active' ? '正常' : '已禁用'}
            </div>
          </div>
          
          <div className="bg-muted/5 backdrop-blur-sm border border-border/10 rounded-2xl p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground/60 mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">登录失败</span>
            </div>
            <div className={cn(
              "text-lg font-bold transition-colors flex items-center gap-2",
              detail.failedLoginCount > 0 ? "text-warning" : "text-foreground"
            )}>
              {detail.failedLoginCount} 
              <span className="text-xs font-medium text-muted-foreground/50 self-end mb-1">次尝试</span>
            </div>
          </div>
        </div>

        {/* Detailed Info Sections */}
        <div className="space-y-6">
          {/* Contact Info */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">联系信息</h4>
            <div className="bg-card/30 backdrop-blur border border-border/10 rounded-2xl overflow-hidden divide-y divide-border/5">
              <div className="p-4 flex items-center gap-4 hover:bg-muted/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-info" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground/60 font-medium mb-0.5">邮箱地址</span>
                  <span className="text-sm font-medium text-foreground truncate">{detail.email || '未绑定'}</span>
                </div>
              </div>
              <div className="p-4 flex items-center gap-4 hover:bg-muted/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-info" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground/60 font-medium mb-0.5">手机号码</span>
                  <span className="text-sm font-medium text-foreground truncate">{detail.phone || '未绑定'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Security Info */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] pl-1">安全审计</h4>
            <div className="bg-card/30 backdrop-blur border border-border/10 rounded-2xl overflow-hidden divide-y divide-border/5">
              <div className="p-4 flex items-center gap-4 hover:bg-muted/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-success" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-medium mb-0.5">注册时间</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(detail.createdAt)}</span>
                </div>
              </div>
              <div className="p-4 flex items-center gap-4 hover:bg-muted/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-medium mb-0.5">最近更新</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(detail.updatedAt)}</span>
                </div>
              </div>
              <div className="p-4 flex items-center gap-4 hover:bg-muted/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-error" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-medium mb-0.5">密码变更</span>
                  <span className="text-sm font-medium text-foreground">{detail.passwordUpdatedAt ? formatDate(detail.passwordUpdatedAt) : '未设置'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="pt-4 flex flex-col gap-3">
            {onRevoke && (
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 h-11"
                onClick={onRevoke}
              >
                <UserX className="mr-2 h-4 w-4" />
                强制下线 (撤销会话)
              </Button>
            )}
            
            {onUnlock && detail.lockedUntil && (
              <Button
                variant="primary"
                className="w-full bg-success hover:bg-success/90 text-white h-11"
                onClick={onUnlock}
                disabled={isUnlocking}
              >
                {isUnlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                解锁账户
              </Button>
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:!max-w-none bg-background/95 backdrop-blur-2xl text-foreground w-[420px] max-w-[90vw] p-0 overflow-hidden flex flex-col border-l border-border/20 shadow-2xl">
        <div className="px-6 py-4 border-b border-border/10 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <SheetTitle className="text-lg font-bold text-foreground">用户详情</SheetTitle>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6 relative">
           {/* Background Decor */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none" />
           
           <div className="relative z-10 py-6">
             <SheetDescription className="sr-only">Detailed view of user attributes and status.</SheetDescription>
             {renderContent()}
           </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
