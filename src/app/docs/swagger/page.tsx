import { env } from "@/config";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants/token";
import { TokenManager } from "@/lib/security/token-manager";
import { SwaggerUi } from "@/components/docs/swagger-ui";
import { createOpenApiDocumentV1 } from "@/lib/openapi/v1";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SwaggerPage() {
  const spec = createOpenApiDocumentV1() as unknown as Record<string, unknown>;

  const isDev = env.NODE_ENV === "development";

  const page = (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Swagger UI</h1>
          <p className="mt-1 text-sm text-foreground/70">
            用于后端接口自检与调试。鉴权使用 HttpOnly Cookie（access_token），Try it out 会自动携带同域 Cookie。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs text-foreground/70">
            环境：{isDev ? "开发" : "生产"}
          </div>
          <div className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs text-foreground/70">
            访问：{isDev ? "公开" : "仅管理员"}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-foreground/80">
              <p>
                1）先在后台完成登录（会写入 Cookie）。然后回到本页使用接口调试。
              </p>
              <p>
                2）接口按 Tag 分组（如 auth/admin/rbac），默认折叠；可展开某个接口后点击 Try it out。
              </p>
              <p>
                3）如果你看到 401/403，一般是未登录或没有 admin 角色。
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                打开后台登录
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                打开后台首页
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>接口浏览</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="swagger-host">
              <SwaggerUi spec={spec} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
  );

  if (isDev) return page;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    notFound();
  }

  try {
    const { roles } = await TokenManager.verifyAccessToken(accessToken);
    if (!roles.includes("admin")) {
      notFound();
    }
  } catch {
    notFound();
  }

  return page;
}
