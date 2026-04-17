/**
 * 文件相关 DTO
 *
 * 从 Schema 推导的纯 TypeScript 类型
 */

import type {
  FileMetadata,
  ListFilesRequest,
  ListFilesResponse,
  SearchFilesRequest,
  SearchFilesResponse,
} from '@/lib/storage/schema/file.schema'

// 重新导出从 Schema 推导的类型
export type {
  FileMetadata,
  ListFilesRequest,
  ListFilesResponse,
  SearchFilesRequest,
  SearchFilesResponse,
}
