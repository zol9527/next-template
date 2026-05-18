"use client";

import * as React from "react";
import { Users, DollarSign, FileCheck, Wallet, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminPromoterList } from "@/components/business/admin/promotion/admin-promoter-list";
import { AdminCommissionList } from "@/components/business/admin/promotion/admin-commission-list";
import { AdminOrderSettlementView } from "@/components/business/admin/promotion/admin-order-settlement-view";
import { AdminSettlementApplicationList } from "@/components/business/admin/promotion/admin-settlement-application-list";
import {
  CommissionSettingsModal,
  CommissionSettingsTrigger,
} from "@/components/business/admin/promotion/admin-commission-settings-modal";
import { ShopMainCard } from "@/components/business/admin/shop/shop-main-card";
import { ShopSearchInput } from "@/components/business/admin/shop/shop-search-input";
import { ShopKPICards, type KPICard } from "@/components/business/admin/shop/shop-kpi-cards";
import { Button } from "@/components/ui/button";

/**
 * Function: AdminAffiliateClient
 *
 * Description: 分销管理页面，使用 ShopMainCard 统一容器
 *
 * 设计规范:
 *   - TabBar 右侧: 搜索框 (220px) + 「导出数据」按钮
 *   - 内容区:
 *     1. KPI 卡片行(4个): 推广员总数、总佣金、本月佣金、待结算
 *     2. 推广员表格 + 内部 Tab 切换（保留原有 Tabs 结构）
 *     3. 分页
 *
 * Returns:
 *	element(React.ReactElement): 分销管理页面
 */
export function AdminAffiliateClient() {
  // 共享刷新状态
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");

  const handleRefresh = React.useCallback(() => {
    setRefreshKey((x) => x + 1);
  }, []);

  /**
   * KPI 卡片数据
   *
   * TODO(high): 数量为硬编码占位值，需从 API 获取真实统计数据
   * 预留接口: GET /api/v1/admin/promotion/stats → { totalPromoters, totalCommission, monthlyCommission, pendingSettlement }
   * 接入后替换下方硬编码为 useQuery 获取的数据
   */
  const kpiCards: KPICard[] = [
    {
      label: "推广员总数",
      value: 86,
      icon: <Users className="h-4 w-4" />,
      iconBg: "bg-ds-accent-subtle",
      iconColor: "text-primary",
    },
    {
      label: "总佣金",
      value: "¥12,450",
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: "bg-teal-subtle",
      iconColor: "text-teal",
    },
    {
      label: "本月佣金",
      value: "¥2,890",
      icon: <FileCheck className="h-4 w-4" />,
      iconBg: "bg-gold-subtle",
      iconColor: "text-gold",
    },
    {
      label: "待结算",
      value: "¥1,230",
      icon: <Wallet className="h-4 w-4" />,
      iconBg: "bg-rose-subtle",
      iconColor: "text-rose",
    },
  ];

  return (
    <ShopMainCard
      activeTab="affiliate"
      headerRight={
        <>
          <ShopSearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索推广员..."
          />
          <Button
            variant="outline"
            className="gap-2 border-border-default rounded-lg h-8 text-body-sm"
          >
            <Download className="h-4 w-4" />
            导出数据
          </Button>
        </>
      }
    >
      {/* KPI 卡片行 */}
      <ShopKPICards cards={kpiCards} className="mb-6" />

      {/* 内部 Tabs（推广员/佣金/结算/提现） */}
      <Tabs defaultValue="promoters" className="w-full">
        <TabsList className="bg-surface-alt p-1 h-10 rounded-lg">
          <TabsTrigger
            value="promoters"
            className="px-4 h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-body-sm motion-safe:transition-all motion-safe:duration-200"
          >
            <Users className="h-4 w-4 mr-1.5" />
            推广员管理
          </TabsTrigger>
          <TabsTrigger
            value="commissions"
            className="px-4 h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-body-sm motion-safe:transition-all motion-safe:duration-200"
          >
            <DollarSign className="h-4 w-4 mr-1.5" />
            佣金记录
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="px-4 h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-body-sm motion-safe:transition-all motion-safe:duration-200"
          >
            <FileCheck className="h-4 w-4 mr-1.5" />
            结算管理
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="px-4 h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-body-sm motion-safe:transition-all motion-safe:duration-200"
          >
            <Wallet className="h-4 w-4 mr-1.5" />
            提现申请
          </TabsTrigger>
        </TabsList>

        {/* 推广员管理 */}
        <TabsContent value="promoters" className="mt-4">
          <React.Suspense fallback={<div className="h-96 flex items-center justify-center text-fg-muted">加载中...</div>}>
            <AdminPromoterList refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
          </React.Suspense>
          <CommissionSettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onSuccess={() => setRefreshKey((prev) => prev + 1)}
          />
        </TabsContent>

        {/* 佣金管理 */}
        <TabsContent value="commissions" className="mt-4">
          <AdminCommissionList refreshKey={refreshKey} />
        </TabsContent>

        {/* 结算管理 */}
        <TabsContent value="settlements" className="mt-4">
          <AdminOrderSettlementView refreshKey={refreshKey} onSuccess={handleRefresh} />
        </TabsContent>

        {/* 提现申请 */}
        <TabsContent value="applications" className="mt-4">
          <React.Suspense fallback={<div className="h-96 flex items-center justify-center text-fg-muted">加载中...</div>}>
            <AdminSettlementApplicationList refreshKey={refreshKey} onRefresh={handleRefresh} />
          </React.Suspense>
        </TabsContent>
      </Tabs>

      {/* 佣金设置按钮（浮在 Tabs 外部） */}
      <CommissionSettingsTrigger onClick={() => setSettingsOpen(true)} />
    </ShopMainCard>
  );
}
