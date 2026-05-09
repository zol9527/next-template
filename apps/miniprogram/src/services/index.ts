/**
 * Function: services/index
 *
 * Description: 服务模块统一导出入口
 *
 * Returns:
 *   exports(object): 导出的所有服务
 */

// API 服务
export * from './api';

// 用户文档服务
export { UserDocumentsService, DocumentType, DocumentTypeLabels } from './user-documents';
