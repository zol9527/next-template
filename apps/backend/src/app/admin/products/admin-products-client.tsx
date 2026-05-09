"use client";

import * as React from "react";
import { Plus, Search, Package, CheckCircle, AlertCircle, Star, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AdminProductForm } from "@/components/business/admin/product/admin-product-form";
import { AdminProductList } from "@/components/business/admin/product/admin-product-list";
import { AdminFilterBar } from "@/components/ui/admin-filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { KPICard } from "@/components/ui/kpi-card";
import type { AdminCategory } from "@/plugins/ecommerce/contracts/admin-categories.dto";
import type { ApiResponse } from "@/contracts/api-response.schema";
import type { AdminProductStats } from "@/plugins/ecommerce/contracts/admin-products.dto";
import { AdminProductStatsSchema } from "@/plugins/ecommerce/contracts/admin-products.dto";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";

/**
Function: AdminProductsClient

Description: 后台商品管理页面：串联"列表→新建→编辑→上下架"的最小闭环。采用仪表盘布局设计。支持关键词搜索、状态、类型及分类筛选。使用 TanStack Query 管理数据获取。

Parameters:

Returns:
	element(React.ReactElement): 商品管理页面
*/
export function AdminProductsClient() {
  const queryClient = useQueryClient();
  const [activeProductId, setActiveProductId] = React.useState<string | null>(
    null
  );
  const [mode, setMode] = React.useState<"idle" | "create" | "edit" | "view">(
    "idle"
  );

  // 筛选状态
  const [keyword, setKeyword] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [kind, setKind] = React.useState<string>("all");
  const [categoryId, setCategoryId] = React.useState<string>("all");

  // Select 打开状态（选择后保持打开）
  const [statusSelectOpen, setStatusSelectOpen] = React.useState(false);
  const [kindSelectOpen, setKindSelectOpen] = React.useState(false);
  const [categorySelectOpen, setCategorySelectOpen] = React.useState(false);

  // 标记是否正在选择（用于防止 onOpenChange 关闭）
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

  // 使用 useQuery 获取分类列表
  const { data: categoriesData } = useQuery<{
    items: AdminCategory[];
  }>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/categories", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.statusText}`);
      }
      const json = (await res.json()) as ApiResponse<{
        items: AdminCategory[];
      }>;
      if (!json.success) {
        throw new Error(json.error.message);
      }
      return { items: json.data.items };
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
  });

  const categories = categoriesData?.items ?? [];

  // 使用 useQuery 获取商品统计数据
  const { data: stats } = useQuery<AdminProductStats>({
    queryKey: ['admin', 'products', 'stats'],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/products/stats", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch product stats: ${res.statusText}`);
      }
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.success) {
        throw new Error(json.error.message);
      }
      const parsed = AdminProductStatsSchema.safeParse(json.data);
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期');
      }
      return parsed.data;
    },
    staleTime: 60 * 1000, // 1 分钟内数据视为新鲜
  });

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* KPI 卡片行 - 商品管理指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="总商品"
          value={stats?.totalProducts ?? 0}
          icon={<Package className="h-4 w-4" />}
        />
        <KPICard
          title="已上架"
          value={stats?.publishedCount ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <KPICard
          title="草稿"
          value={stats?.draftCount ?? 0}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <KPICard
          title="精选"
          value={stats?.featuredCount ?? 0}
          icon={<Star className="h-4 w-4" />}
        />
        <KPICard
          title="今日新增"
          value={stats?.todayAdded ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="库存预警"
          value={stats?.lowStockCount ?? 0}
          icon={<AlertCircle className="h-4 w-4" />}
          trendUp={false}
        />
      </div>

      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="shadow-lg shadow-primary/20 gap-2"
            onClick={() => {
              setActiveProductId(null);
              setMode("create");
            }}
          >
            <Plus className="h-4 w-4" />
            新建商品
          </Button>
        </div>
      </div>

      {/* 搜索与筛选工具栏 */}
      <AdminFilterBar>
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="搜索商品名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 h-10 bg-muted/5 border-none shadow-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 产品状态 */}
          <Select
            value={status}
            onValueChange={(value) => {
              isSelectingRef.current = true;
              setStatus(value);
              setStatusSelectOpen(true);
              setTimeout(() => {
                isSelectingRef.current = false;
              }, 0); // 重置标记
            }}
            open={statusSelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) return;
              setStatusSelectOpen(open);
            }}
          >
            <SelectTrigger className="w-30 h-10 bg-muted/20 border-border/30 hover:bg-muted/10 data-[state=open]:bg-muted/10">
              <SelectValue placeholder="所有状态" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/40">
              <SelectGroup>
                <SelectLabel>状态</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已上架</SelectItem>
                <SelectItem value="unpublished">已下架</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* 产品类型 */}
          <Select
            value={kind}
            onValueChange={(value) => {
              isSelectingRef.current = true;
              setKind(value);
              setKindSelectOpen(true);
              setTimeout(() => {
                isSelectingRef.current = false;
              }, 0); // 重置标记
            }}
            open={kindSelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) return;
              setKindSelectOpen(open);
            }}
          >
            <SelectTrigger className="w-30 h-10 bg-muted/20 border-border/30 hover:bg-muted/10 data-[state=open]:bg-muted/10">
              <SelectValue placeholder="所有类型" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/40">
              <SelectGroup>
                <SelectLabel>类型</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="course">课程</SelectItem>
                <SelectItem value="certificate">证书</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={categoryId}
            onValueChange={(value) => {
              isSelectingRef.current = true;
              setCategoryId(value);
              setCategorySelectOpen(true);
              setTimeout(() => {
                isSelectingRef.current = false;
              }, 0); // 重置标记
            }}
            open={categorySelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) return;
              setCategorySelectOpen(open);
            }}
          >
            <SelectTrigger className="w-40 h-10 bg-muted/20 border-border/30 hover:bg-muted/10 data-[state=open]:bg-muted/10">
              <SelectValue placeholder="所有分类" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/40">
              <SelectGroup>
                <SelectLabel>分类</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">所有分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {(keyword ||
            status !== "all" ||
            kind !== "all" ||
            categoryId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeyword("");
                setStatus("all");
                setKind("all");
                setCategoryId("all");
              }}
              className="h-10 text-foreground/40 hover:text-foreground hover:bg-muted/20 whitespace-nowrap"
              style={{ writingMode: "horizontal-tb" }}
            >
              重置
            </Button>
          )}
        </div>
      </AdminFilterBar>

      {/* 列表区域 */}
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

      {/* 表单弹窗 */}
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
    </div>
  );
}
