// src/components/business/admin/profile/profile-page.tsx
'use client';

import { useState } from 'react';
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/ui/admin-tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Smartphone, Key } from 'lucide-react';
import { AdminPageLayout } from '@/components/ui/admin-page-layout';
import { ProfileBasicInfoTab } from './profile-basic-info-tab';
import { ProfileSecurityTab } from './profile-security-tab';
import { ProfileDevicesTab } from './profile-devices-tab';

/**
 * Function: ProfilePage
 *
 * Description: 管理员个人资料页面主组件，使用 Tabs 组织不同功能模块
 *
 * Returns:
 *   JSX.Element: 个人资料页面
 */
export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('basic');

  return (
    <AdminPageLayout>
      <AdminTabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <AdminTabsList>
          <AdminTabsTrigger value="basic" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">基本信息</span>
          </AdminTabsTrigger>
          <AdminTabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">账户安全</span>
          </AdminTabsTrigger>
          <AdminTabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">登录设备</span>
          </AdminTabsTrigger>
          <AdminTabsTrigger value="mfa" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">MFA 设置</span>
          </AdminTabsTrigger>
        </AdminTabsList>

        <AdminTabsContent value="basic" className="space-y-4">
          <ProfileBasicInfoTab />
        </AdminTabsContent>

        <AdminTabsContent value="security" className="space-y-4">
          <ProfileSecurityTab />
        </AdminTabsContent>

        <AdminTabsContent value="devices" className="space-y-4">
          <ProfileDevicesTab />
        </AdminTabsContent>

        <AdminTabsContent value="mfa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MFA 设置</CardTitle>
              <CardDescription>
                MFA 设置已移至独立页面，点击下方按钮前往
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <a
                href="/admin/mfa-setup"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                前往 MFA 设置页面
              </a>
            </div>
          </Card>
        </AdminTabsContent>
      </AdminTabs>
    </AdminPageLayout>
  );
}
