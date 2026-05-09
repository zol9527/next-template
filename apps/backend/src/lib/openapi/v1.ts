import { z } from 'zod'
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'

import { ApiSuccessResponseSchema, ApiFailureResponseSchema } from '@/contracts/api-response.schema'

import { PasswordLoginRequestSchema, PasswordLoginResponseSchema } from '@/contracts/dtos/auth/password-login.dto'
import { RefreshSessionResponseSchema } from '@/contracts/dtos/auth/refresh.dto'
import { LogoutResponseSchema } from '@/contracts/dtos/auth/logout.dto'
import { MeResponseSchema } from '@/contracts/dtos/auth/me.dto'
import { WechatLoginRequestSchema, WechatLoginResponseSchema } from '@/plugins/wechat/contracts/wechat-login.dto'

import { CreateOrderRequestSchema, CreateOrderResponseSchema, OrderDetailResponseSchema } from '@/plugins/ecommerce/contracts/orders.dto'
import { CreateWechatPayRequestSchema, CreateWechatPayResponseSchema } from '@/plugins/wechat/contracts/wechat-pay.dto'

import { BindDistributionRequestSchema, BindDistributionResponseSchema } from '@/plugins/promotion/contracts/distribution.dto'
import { AdminCommissionListResponseSchema } from '@/plugins/promotion/contracts/commissions.dto'
import { AdminOrderListResponseSchema, AdminCompleteOrderResponseSchema } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import { AdminCreateSettlementRequestSchema, AdminCreateSettlementResponseSchema } from '@/plugins/promotion/contracts/settlements.dto'

import { AdminUserListResponseSchema } from '@/contracts/dtos/admin/users.dto'
import { AdminUserDetailResponseSchema } from '@/contracts/dtos/admin/user-detail.dto'
import { AdminDisableUserResponseSchema, AdminEnableUserResponseSchema } from '@/contracts/dtos/admin/user-status.dto'
import {
  AdminUserRolesResponseSchema,
  AdminAssignUserRoleRequestSchema,
  AdminRemoveUserRoleRequestSchema,
  AdminSetUserRolesRequestSchema,
} from '@/contracts/dtos/admin/user-roles.dto'

import { AdminRbacRolesResponseSchema } from '@/contracts/dtos/admin/rbac/roles.dto'
import { AdminRbacScopesResponseSchema } from '@/contracts/dtos/admin/rbac/permissions.dto'
import {
  AdminRbacRolePermissionsResponseSchema,
  AdminRbacUpdateRolePermissionsRequestSchema,
  AdminRbacUpdateRolePermissionsResponseSchema,
} from '@/contracts/dtos/admin/rbac/role-permissions.dto'

import {
  AdminProductSchema,
  AdminProductListResponseSchema,
  AdminCreateProductRequestSchema,
  AdminUpdateProductRequestSchema,
  AdminProductStatusUpdateResponseSchema,
} from '@/plugins/ecommerce/contracts/admin-products.dto'

import {
  AdminCategoryTreeResponseSchema,
  AdminCategorySchema,
  AdminCreateCategoryRequestSchema,
  AdminUpdateCategoryRequestSchema,
  AdminDeleteCategoryResponseSchema,
} from '@/plugins/ecommerce/contracts/admin-categories.dto'

import {
  AdminMediaAssetListResponseSchema,
  AdminMediaAssetSchema,
  AdminCreateMediaAssetRequestSchema,
} from '@/contracts/dtos/admin/media-assets.dto'

import { AdminOssUploadPolicyRequestSchema, AdminOssUploadPolicyResponseSchema } from '@/contracts/dtos/admin/oss-upload-policy.dto'
import {
  ToggleUploadPermissionRequestSchema,
  ToggleUploadPermissionResponseSchema,
} from '@/contracts/dtos/admin/users.dto'
import { UploadPermissionResponseSchema } from '@/contracts/dtos/user.dto'

extendZodWithOpenApi(z)

const OkSchema = z.object({ ok: z.boolean().openapi({ description: '是否成功' }) })

/**
Function: createOpenApiDocumentV1

Description: 生成 v1 API 的 OpenAPI 3.0 文档（基于 contracts 中的 Zod Schema 注册路径）

Parameters:

Returns:
    document(object): OpenAPI 3 文档 JSON
*/
export function createOpenApiDocumentV1() {
  const registry = new OpenAPIRegistry()

  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'access_token',
    description: '使用 HttpOnly Cookie `access_token` 进行鉴权',
  })

  // ---------- Auth ----------
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['auth'],
    description: '账号密码登录（成功后服务端会下发 access_token/refresh_token Cookie）',
    request: {
      body: {
        content: {
          'application/json': {
            schema: PasswordLoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '登录成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(PasswordLoginResponseSchema),
          },
        },
      },
      400: {
        description: '参数错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      401: {
        description: '认证失败/被锁定/被禁用',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      429: {
        description: '请求过于频繁',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/wechat',
    tags: ['auth'],
    description: '微信小程序登录（成功后服务端会下发 access_token/refresh_token Cookie）',
    request: {
      body: {
        content: {
          'application/json': {
            schema: WechatLoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '登录成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(WechatLoginResponseSchema),
          },
        },
      },
      400: {
        description: '参数错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      401: {
        description: '认证失败',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      429: {
        description: '请求过于频繁',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/refresh',
    tags: ['auth'],
    description: '刷新会话（refresh_token 通过 HttpOnly Cookie 传递）',
    responses: {
      200: {
        description: '刷新成功（会下发新的 Cookie）',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(RefreshSessionResponseSchema),
          },
        },
      },
      401: {
        description: '未登录/refresh token 失效/检测到复用',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      429: {
        description: '请求过于频繁',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['auth'],
    description: '登出（服务端撤销 refresh token 对应会话，并清理 Cookie）',
    responses: {
      200: {
        description: '登出成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(LogoutResponseSchema),
          },
        },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/user/me',
    tags: ['user'],
    description: '获取当前登录用户信息（含角色与权限）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(MeResponseSchema),
          },
        },
      },
      401: {
        description: '未登录',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  // ---------- Orders (User) ----------
  registry.registerPath({
    method: 'post',
    path: '/api/v1/user/orders',
    tags: ['user', 'orders'],
    description: '创建订单（用户侧）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateOrderRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '创建成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(CreateOrderResponseSchema),
          },
        },
      },
      400: {
        description: '参数错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      401: {
        description: '未登录',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/user/orders/{orderId}',
    tags: ['user', 'orders'],
    description: '获取订单详情（用户侧）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({
        orderId: z.string().uuid().openapi({ description: '订单 ID' }),
      }),
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(OrderDetailResponseSchema),
          },
        },
      },
      401: {
        description: '未登录',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      404: {
        description: '订单不存在',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/user/orders/{orderId}/wechat-pay',
    tags: ['user', 'orders', 'wechat-pay'],
    description: '为订单发起微信支付（用户侧）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({
        orderId: z.string().uuid().openapi({ description: '订单 ID' }),
      }),
      body: {
        content: {
          'application/json': {
            schema: CreateWechatPayRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(CreateWechatPayResponseSchema),
          },
        },
      },
      400: {
        description: '参数错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      401: {
        description: '未登录',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      404: {
        description: '订单不存在',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/public/webhooks/wechat/pay/notify',
    tags: ['webhooks', 'wechat-pay'],
    description: '微信支付回调通知（服务端 Webhook）',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({}).passthrough().openapi({ description: '微信支付回调原始 JSON' }),
          },
        },
      },
    },
    responses: {
      200: {
        description: '成功（微信支付平台要求的成功响应）',
        content: {
          'application/json': {
            schema: OkSchema,
          },
        },
      },
      400: {
        description: '回调验签/解密失败',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  // ---------- Distribution (User) ----------
  registry.registerPath({
    method: 'post',
    path: '/api/v1/user/distribution/bind',
    tags: ['user', 'distribution'],
    description: '绑定分销关系（用户侧）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: BindDistributionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(BindDistributionResponseSchema),
          },
        },
      },
      400: {
        description: '参数错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      401: {
        description: '未登录',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      409: {
        description: '已绑定/不允许重复绑定',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
      500: {
        description: '服务端错误',
        content: { 'application/json': { schema: ApiFailureResponseSchema } },
      },
    },
  })

  // ---------- Admin ----------
  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/commissions',
    tags: ['admin', 'commissions'],
    description: '后台佣金列表（最多 50 条）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(AdminCommissionListResponseSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/orders',
    tags: ['admin', 'orders'],
    description: '后台订单列表（最多 50 条）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(AdminOrderListResponseSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/orders/{orderId}/complete',
    tags: ['admin', 'orders'],
    description: '后台确认订单完成/交付确认（幂等）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({
        orderId: z.string().uuid().openapi({ description: '订单 ID' }),
      }),
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(AdminCompleteOrderResponseSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '订单不存在', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      409: { description: '状态不允许', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/settlements',
    tags: ['admin', 'settlements'],
    description: '后台创建并执行结算（幂等/并发安全）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AdminCreateSettlementRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(AdminCreateSettlementResponseSchema),
          },
        },
      },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      409: { description: '结算冲突/重复', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/ping',
    tags: ['admin'],
    description: '管理员健康检查',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(OkSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/me',
    tags: ['admin'],
    description: '获取当前管理员信息（含角色与权限）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: { 'application/json': { schema: ApiSuccessResponseSchema(MeResponseSchema) } },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/users',
    tags: ['admin'],
    description: '后台用户列表（最多 50 条）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(AdminUserListResponseSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/users/{id}',
    tags: ['admin'],
    description: '后台用户详情',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
    },
    responses: {
      200: {
        description: '成功',
        content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminUserDetailResponseSchema) } },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/users/{id}/disable',
    tags: ['admin'],
    description: '后台封禁用户（可选撤销全部会话）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
    },
    responses: {
      200: {
        description: '成功',
        content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminDisableUserResponseSchema) } },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/users/{id}/enable',
    tags: ['admin'],
    description: '后台启用用户',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
    },
    responses: {
      200: {
        description: '成功',
        content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminEnableUserResponseSchema) } },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/users/{id}/roles',
    tags: ['admin', 'rbac'],
    description: '查询用户角色列表',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
    },
    responses: {
      200: {
        description: '成功',
        content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminUserRolesResponseSchema) } },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/users/{id}/roles',
    tags: ['admin', 'rbac'],
    description: '给用户分配单个角色',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminAssignUserRoleRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(OkSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/admin/users/{id}/roles',
    tags: ['admin', 'rbac'],
    description: '移除用户的单个角色',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminRemoveUserRoleRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(OkSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'put',
    path: '/api/v1/admin/users/{id}/roles',
    tags: ['admin', 'rbac'],
    description: '覆盖式设置用户角色列表',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '用户 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminSetUserRolesRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(OkSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  // ---------- Admin RBAC ----------
  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/rbac/roles',
    tags: ['admin', 'rbac'],
    description: '查询角色列表',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminRbacRolesResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/rbac/permissions',
    tags: ['admin', 'rbac'],
    description: '查询权限列表',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminRbacScopesResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/rbac/roles/{id}/permissions',
    tags: ['admin', 'rbac'],
    description: '查询角色权限绑定',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '角色 ID' }) }),
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminRbacRolePermissionsResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'put',
    path: '/api/v1/admin/rbac/roles/{id}/permissions',
    tags: ['admin', 'rbac'],
    description: '覆盖式更新角色权限绑定',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '角色 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminRbacUpdateRolePermissionsRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminRbacUpdateRolePermissionsResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  // ---------- Admin Product Management ----------
  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/products',
    tags: ['admin', 'products'],
    description: '商品列表',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductListResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/products',
    tags: ['admin', 'products'],
    description: '创建商品（通用字段）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AdminCreateProductRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductSchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/products/{id}',
    tags: ['admin', 'products'],
    description: '获取商品详情',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '商品 ID' }) }),
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/products/{id}',
    tags: ['admin', 'products'],
    description: '更新商品（通用字段）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '商品 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminUpdateProductRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductSchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/products/{id}/publish',
    tags: ['admin', 'products'],
    description: '上架商品',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '商品 ID' }) }),
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductStatusUpdateResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/products/{id}/unpublish',
    tags: ['admin', 'products'],
    description: '下架商品',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '商品 ID' }) }),
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminProductStatusUpdateResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/categories',
    tags: ['admin', 'categories'],
    description: '获取分类树（扁平列表）',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminCategoryTreeResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/categories',
    tags: ['admin', 'categories'],
    description: '创建分类',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AdminCreateCategoryRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminCategorySchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/categories/{id}',
    tags: ['admin', 'categories'],
    description: '更新分类',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '分类 ID' }) }),
      body: {
        content: {
          'application/json': {
            schema: AdminUpdateCategoryRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminCategorySchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/admin/categories/{id}',
    tags: ['admin', 'categories'],
    description: '删除分类（有引用/子节点时禁止）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({ id: z.string().uuid().openapi({ description: '分类 ID' }) }),
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminDeleteCategoryResponseSchema) } } },
      400: { description: '违反删除规则', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '未找到', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/media-assets',
    tags: ['admin', 'media'],
    description: '媒体资源列表',
    security: [{ cookieAuth: [] }],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminMediaAssetListResponseSchema) } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/media-assets',
    tags: ['admin', 'media'],
    description: '登记媒体资源（上传成功后写入元数据）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AdminCreateMediaAssetRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminMediaAssetSchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/storage/oss/upload-policy',
    tags: ['admin', 'storage'],
    description: '获取 OSS 直传签名（POST Policy）',
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AdminOssUploadPolicyRequestSchema,
          },
        },
      },
    },
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: ApiSuccessResponseSchema(AdminOssUploadPolicyResponseSchema) } } },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  // ---------- Internal User Documents ----------
  registry.registerPath({
    method: 'get',
    path: '/api/v1/internal/user-documents/{id}/file',
    tags: ['internal', 'user-documents'],
    description: '获取用户文档文件（需要认证和权限校验）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().openapi({ description: '文档 ID' }),
      }),
    },
    responses: {
      200: {
        description: '成功（返回文件流）',
        content: {
          'image/jpeg': { schema: { type: 'string', format: 'binary' } },
          'image/png': { schema: { type: 'string', format: 'binary' } },
          'image/webp': { schema: { type: 'string', format: 'binary' } },
          'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限访问', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '文档不存在', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  // ---------- Admin User Upload Permission ----------
  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/users/{id}/upload-permission',
    tags: ['admin', 'users'],
    description: '切换用户上传权限（管理员）',
    security: [{ cookieAuth: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().openapi({ description: '用户 ID' }),
      }),
      body: {
        content: {
          'application/json': {
            schema: ToggleUploadPermissionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(ToggleUploadPermissionResponseSchema),
          },
        },
      },
      400: { description: '参数错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      403: { description: '无权限', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      404: { description: '用户不存在', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  // ---------- User Upload Permission ----------
  registry.registerPath({
    method: 'get',
    path: '/api/v1/user/upload-permission',
    tags: ['user'],
    description: '获取当前用户上传权限',
    security: [{ cookieAuth: [] }],
    responses: {
      200: {
        description: '成功',
        content: {
          'application/json': {
            schema: ApiSuccessResponseSchema(UploadPermissionResponseSchema),
          },
        },
      },
      401: { description: '未登录', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
      500: { description: '服务端错误', content: { 'application/json': { schema: ApiFailureResponseSchema } } },
    },
  })

  const generator = new OpenApiGeneratorV3(registry.definitions)
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Generic Admin API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3000' }],
  })
}
