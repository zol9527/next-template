'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const ADMIN_TABS_LIST = 'bg-muted/5 p-1 h-12 w-full'
const ADMIN_TABS_TRIGGER = 'px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground motion-safe:transition-all motion-safe:duration-200'

interface AdminTabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

// 标准 Pill Tabs 容器
export function AdminTabs({ defaultValue, value, onValueChange, className, children }: AdminTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} value={value} onValueChange={onValueChange} className={cn('w-full', className)}>
      {children}
    </Tabs>
  )
}

// Pill 风格 TabsList
const AdminTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList ref={ref} className={cn(ADMIN_TABS_LIST, className)} {...props} />
))
AdminTabsList.displayName = 'AdminTabsList'

// Pill 风格 TabsTrigger
const AdminTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger ref={ref} className={cn(ADMIN_TABS_TRIGGER, className)} {...props} />
))
AdminTabsTrigger.displayName = 'AdminTabsTrigger'

const AdminTabsContent = TabsContent

export { AdminTabsList, AdminTabsTrigger, AdminTabsContent }
