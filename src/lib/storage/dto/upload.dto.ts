/**
 * 上传相关 DTO
 *
 * 从 Schema 推导的纯 TypeScript 类型
 */

import type {
  OssProvider,
  UploadPolicyRequest,
  UploadPolicyResponse,
} from '@/lib/storage/schema/upload.schema'

// 重新导出从 Schema 推导的类型
export type { OssProvider, UploadPolicyRequest, UploadPolicyResponse }
