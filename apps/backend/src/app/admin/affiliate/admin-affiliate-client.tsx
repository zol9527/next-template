"use client";

import * as React from "react";
import { Users, DollarSign, FileCheck, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminPromoterList } from "@/components/business/admin/promotion/admin-promoter-list";
import { AdminCommissionList } from "@/components/business/admin/promotion/admin-commission-list";
import { AdminOrderSettlementView } from "@/components/business/admin/promotion/admin-order-settlement-view";
import { AdminSettlementApplicationList } from "@/components/business/admin/promotion/admin-settlement-application-list";
import {
  CommissionSettingsModal,
  CommissionSettingsTrigger,
} from "@/components/business/admin/promotion/admin-commission-settings-modal";
import { AdminPageLayout } from "@/components/ui/admin-page-layout";
import { AdminPageHeader } from "@/components/ui/admin-page-header";

/**
 * Function: AdminAffiliateClient
 *
 * Description: 分销管理页面的客户端组件
 *
 * Returns:
 *	element(React.ReactElement): 分销管理页面
 */
export function AdminAffiliateClient() {
  // 共享刷新状态
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 推广员相关状态
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    setRefreshKey((x) => x + 1);
  }, []);

  return (
    <AdminPageLayout>
      {/* 页面头部 */}
      <AdminPageHeader
        description="管理推广员、佣金记录、结算单和提现申请"
        actions={
          <div className="flex gap-2">
            <CommissionSettingsTrigger onClick={() => setSettingsOpen(true)} />
          </div>
        }
      />

      {/* 标签页 */}
      <Tabs defaultValue="promoters" className="w-full">
        <TabsList className="bg-muted/5 p-1 h-12">
          <TabsTrigger
            value="promoters"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            推广员管理
          </TabsTrigger>
          <TabsTrigger
            value="commissions"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            佣金记录
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            结算管理
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            <Wallet className="h-4 w-4 mr-2" />
            提现申请
          </TabsTrigger>
        </TabsList>

        {/* 推广员管理标签页 */}
        <TabsContent value="promoters" className="mt-6 space-y-6">
          <React.Suspense fallback={<div className="h-96 flex items-center justify-center">加载中...</div>}>
            <AdminPromoterList
              refreshKey={refreshKey}
              setRefreshKey={setRefreshKey}
            />
          </React.Suspense>
          <CommissionSettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onSuccess={() => setRefreshKey((prev) => prev + 1)}
          />
        </TabsContent>

        {/* 佣金管理标签页 */}
        <TabsContent value="commissions" className="mt-6 space-y-6">
          <AdminCommissionList refreshKey={refreshKey} />
        </TabsContent>

        {/* 结算管理标签页 */}
        <TabsContent value="settlements" className="mt-6 space-y-6">
          <AdminOrderSettlementView
            refreshKey={refreshKey}
            onSuccess={handleRefresh}
          />
        </TabsContent>

        {/* 提现申请标签页 */}
        <TabsContent value="applications" className="mt-6 space-y-6">
          <React.Suspense fallback={<div className="h-96 flex items-center justify-center">加载中...</div>}>
            <AdminSettlementApplicationList
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
