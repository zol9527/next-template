import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

/**
 * Component: AdminMiniprogramSettingsPage
 *
 * Description: 小程序基础设置页面
 * 配置小程序的基础信息和功能开关
 */
export default function AdminMiniprogramSettingsPage() {
  if (!isPluginEnabled('wechat')) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">基础设置</h2>
        <p className="text-muted-foreground mt-1">
          配置微信小程序的基础信息和功能开关
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基础设置</CardTitle>
          <CardDescription>配置小程序的基础信息和功能开关</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">此功能即将推出</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
