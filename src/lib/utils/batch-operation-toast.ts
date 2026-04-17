import type { ToastVariant } from '@/components/ui/toast'

export type BatchOperationToastInput = {
  titlePrefix: string
  actionLabel: string
  successCount: number
  failedCount: number
}

export type BatchOperationToastOutput = {
  title: string
  description: string
  variant: ToastVariant
}

/**
Function: buildBatchOperationToast

Description: 根据批量操作的成功/失败数量生成 toast 的标题、描述与样式，避免错误拼接 boolean，并在全失败时返回 destructive 样式

Parameters:
  input(object): 输入参数
  input.titlePrefix(string): 标题前缀（如：批量下架）
  input.actionLabel(string): 动作文案（如：下架/上架/删除）
  input.successCount(number): 成功数量
  input.failedCount(number): 失败数量

Returns:
  output(object): toast 输出
  output.title(string): toast 标题
  output.description(string): toast 描述
  output.variant(ToastVariant): toast 样式（default/destructive）
*/
export function buildBatchOperationToast(input: BatchOperationToastInput): BatchOperationToastOutput {
  const failedText = input.failedCount > 0 ? `，失败 ${input.failedCount} 个` : ''
  const description = `成功${input.actionLabel} ${input.successCount} 个商品${failedText}`

  // 全失败：用失败标题 + destructive
  if (input.successCount === 0 && input.failedCount > 0) {
    return {
      title: `${input.titlePrefix}失败`,
      description,
      variant: 'destructive',
    }
  }

  // 部分失败：标题提示但不使用 destructive，避免误伤已成功部分
  if (input.failedCount > 0) {
    return {
      title: `${input.titlePrefix}部分失败`,
      description,
      variant: 'default',
    }
  }

  return {
    title: `${input.titlePrefix}成功`,
    description,
    variant: 'default',
  }
}
