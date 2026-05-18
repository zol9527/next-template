"use client";

import * as React from "react";
import { Plus, Search, Package, CheckCircle, AlertCircle, Star, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AdminProductForm } from "@/components/business/admin/product/admin-product-form";
import { AdminProductList } from "@/components/business/admin/product/admin-product-list";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import type { AdminCategory } from "@/plugins/ecommerce/contracts/admin-categories.dto";
import type { ApiResponse } from "@/contracts/api-response.schema";
import type { AdminProductStats } from "@/plugins/ecommerce/contracts/admin-products.dto";
import { AdminProductStatsSchema } from "@/plugins/ecommerce/contracts/admin-products.dto";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { ShopMainCard } from "@/components/business/admin/shop/shop-main-card";
import { ShopSearchInput } from "@/components/business/admin/shop/shop-search-input";
import { ShopStatusFilter, type FilterItem } from "@/components/business/admin/shop/shop-status-filter";

/**
 * Function: AdminProductsClient
 *
 * Description: 后台商品管理页面：使用 ShopMainCard 统一容器 + Tab 导航。
 * 支持关键词搜索、状态/类型/分类筛选。使用 TanStack Query 管理数据获取。
 *
 * 设计规范:
 *   - TabBar 右侧: 搜索框 (220px) + 「添加商品」按钮 (橙色实心)
 *   - 内容区:
 *     1. 状态筛选行: 全部 | 上架中 | 低库存 | 草稿 | 已下架
 *     2. 右侧辅助筛选: 「全部分类」下拉 + 「按销量」下拉
 *     3. 商品列表（保留原有 AdminProductList 组件）
 *
 * Parameters:
 *
 * Returns:
 * 	element(React.ReactElement): 商品管理页面
 */
export function AdminProductsClient() {
  const queryClient = useQueryClient();
  const [activeProductId, setActiveProductId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"idle" | "create" | "edit" | "view">("idle");

  // 筛选状态
  const [keyword, setKeyword] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [kind, setKind] = React.useState<string>("all");
  const [categoryId, setCategoryId] = React.useState<string>("all");

  // Select 打开状态
  const [statusSelectOpen, setStatusSelectOpen] = React.useState(false);
  const [kindSelectOpen, setKindSelectOpen] = React.useState(false);
  const [categorySelectOpen, setCategorySelectOpen] = React.useState(false);
  const isSelectingRef = React.useRef(false);

  const debouncedKeyword = useDebounce(keyword, 500);

  const filters = React.useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      status: status === "all" ? undefined : status,
      kind: kind === "all" ? undefined : kind,
      categoryIds: categoryId === "all" ? undefined : [categoryId],
    }),
    [debouncedKeyword, status, kind, categoryId]
  );

  // 获取分类列表
  const { data: categoriesData } = useQuery<{ items: AdminCategory[] }>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/categories", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);
      const json = (await res.json()) as ApiResponse<{ items: AdminCategory[] }>;
      if (!json.success) throw new Error(json.error.message);
      return { items: json.data.items };
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData?.items ?? [];

  // 获取商品统计数据
  const { data: stats } = useQuery<AdminProductStats>({
    queryKey: ['admin', 'products', 'stats'],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/products/stats", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch product stats: ${res.statusText}`);
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error.message);
      const parsed = AdminProductStatsSchema.safeParse(json.data);
      if (!parsed.success) throw new Error('响应数据格式不符合预期');
      return parsed.data;
    },
    staleTime: 60 * 1000,
  });

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  /**
   * 状态筛选项配置
   * 与 Paper Design 规范对齐：全部 | 上架中 | 低库存 | 草稿 | 已下架
   */
  const statusFilters: FilterItem[] = React.useMemo(() => [
    { label: '全部', count: stats?.totalProducts ?? 0, value: 'all' },
    { label: '上架中', count: stats?.publishedCount ?? 0, value: 'published', color: 'success' },
    { label: '低库存', count: stats?.lowStockCount ?? 0, value: 'low_stock', color: 'warning' },
    { label: '草稿', count: stats?.draftCount ?? 0, value: 'draft' },
    { label: '已下架', count: (stats?.totalProducts ?? 0) - (stats?.publishedCount ?? 0) - (stats?.draftCount ?? 0), value: 'unpublished', color: 'rose' },
  ], [stats]);

  return (
    <ShopMainCard
      activeTab="products"
      headerRight={
        <>
          <ShopSearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索商品名称..."
          />
          <Button
            type="button"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => {
              setActiveProductId(null);
              setMode("create");
            }}
          >
            <Plus className="h-4 w-4" />
            添加商品
          </Button>
        </>
      }
    >
      {/* 状态筛选行 */}
      <div className="flex items-center justify-between mb-4">
        <ShopStatusFilter
          filters={statusFilters}
          activeFilter={status}
          onFilterChange={setStatus}
        />

        {/* 右侧辅助筛选 */}
        <div className="flex items-center gap-2">
          {/* 分类筛选 */}
          <Select
            value={categoryId}
            onValueChange={(value) => {
              isSelectingRef.current = true;
              setCategoryId(value);
              setCategorySelectOpen(true);
              setTimeout(() => { isSelectingRef.current = false }, 0);
            }}
            open={categorySelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) return;
              setCategorySelectOpen(open);
            }}
          >
            <SelectTrigger className="w-[130px] h-8 bg-surface border border-border-default rounded-lg text-body-sm text-fg-secondary hover:border-border-medium focus-visible:ring-1 focus-visible:ring-primary/30">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent className="bg-surface border border-border-default rounded-lg shadow-lg">
              <SelectGroup>
                <SelectLabel className="text-caption text-fg-muted">分类</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* 排序筛选 */}
          <Select
            value={kind}
            onValueChange={(value) => {
              isSelectingRef.current = true;
              setKind(value);
              setKindSelectOpen(true);
              setTimeout(() => { isSelectingRef.current = false }, 0);
            }}
            open={kindSelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) return;
              setKindSelectOpen(open);
            }}
          >
            <SelectTrigger className="w-[130px] h-8 bg-surface border border-border-default rounded-lg text-body-sm text-fg-secondary hover:border-border-medium focus-visible:ring-1 focus-visible:ring-primary/30">
              <SelectValue placeholder="按销量" />
            </SelectTrigger>
            <SelectContent className="bg-surface border border-border-default rounded-lg shadow-lg">
              <SelectGroup>
                <SelectLabel className="text-caption text-fg-muted">排序</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">默认排序</SelectItem>
                <SelectItem value="sales">按销量</SelectItem>
                <SelectItem value="price">按价格</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* 重置按钮 */}
          {(keyword || status !== "all" || kind !== "all" || categoryId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeyword("");
                setStatus("all");
                setKind("all");
                setCategoryId("all");
              }}
              className="h-8 text-fg-muted hover:text-fg hover:bg-surface-alt whitespace-nowrap"
            >
              重置
            </Button>
          )}
        </div>
      </div>

      {/* 商品列表 */}
      <AdminProductList
        filters={filters}
        onSelect={(productId) => {
          setActiveProductId(productId);
          setMode("edit");
        }}
        onView={(productId) => {
          setActiveProductId(productId);
          setMode("view");
        }}
      />

      {/* 新建/编辑表单弹窗 */}
      {mode !== "idle" && (
        <AdminProductForm
          productId={activeProductId}
          mode={mode}
          onSaved={() => {
            refreshList();
            setMode("idle");
            setActiveProductId(null);
          }}
          onCancel={() => {
            setMode("idle");
            setActiveProductId(null);
          }}
        />
      )}
    </ShopMainCard>
  );
}
