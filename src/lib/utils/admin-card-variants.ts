// 标准 Card 变体样式常量
export const CARD_VARIANTS = {
  default: 'rounded-xl border border-border/20 bg-card shadow-sm',
  interactive: 'rounded-xl border border-border/20 bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200',
  elevated: 'rounded-xl border border-border/10 bg-card/50 backdrop-blur-sm shadow-xl',
  warning: 'rounded-xl border border-destructive/20 bg-destructive/5',
} as const

export type CardVariant = keyof typeof CARD_VARIANTS

// 获取指定变体的 Card className
export function cardVariant(variant: CardVariant): string {
  return CARD_VARIANTS[variant]
}
