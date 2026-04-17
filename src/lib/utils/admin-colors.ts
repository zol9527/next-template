import type { ColorRole } from '@/types/ui-component/semantics'

// 硬编码颜色到语义化角色的映射
const COLOR_MAP: Record<string, ColorRole> = {
  amber: 'warning',
  yellow: 'warning',
  orange: 'warning',
  blue: 'info',
  indigo: 'info',
  red: 'error',
  pink: 'error',
  green: 'success',
  emerald: 'success',
  teal: 'success',
  slate: 'neutral',
}

// 角色到 className 的映射
const ROLE_CLASSES: Record<ColorRole, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  success: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
  error: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30' },
  info: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
}

// 将状态字符串映射为语义化颜色角色
export function statusToColorRole(status: string): ColorRole {
  return COLOR_MAP[status.toLowerCase()] ?? 'neutral'
}

// 获取颜色角色对应的 className
export function colorRoleToClasses(role: ColorRole) {
  return ROLE_CLASSES[role]
}
