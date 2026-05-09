import * as React from 'react'

type DivProps = React.HTMLAttributes<HTMLDivElement>

/**
Function: Card

Description: 一个基础卡片容器组件，用于承载表单或内容区块

Parameters:
	props(DivProps): 原生 div 属性

Returns:
	element(React.ReactElement): 卡片容器
*/
export function Card({ className, ...props }: DivProps) {
  const base = 'rounded-xl border bg-card text-card-foreground shadow'
  return <div className={[base, className].filter(Boolean).join(' ')} {...props} />
}

/**
Function: CardHeader

Description: 卡片头部容器

Parameters:
	props(DivProps): 原生 div 属性

Returns:
	element(React.ReactElement): 头部容器
*/
export function CardHeader({ className, ...props }: DivProps) {
  const base = 'flex flex-col space-y-1.5 p-6'
  return <div className={[base, className].filter(Boolean).join(' ')} {...props} />
}

/**
Function: CardTitle

Description: 卡片标题文本

Parameters:
	props(React.HTMLAttributes<HTMLHeadingElement>): 原生 h3 属性

Returns:
	element(React.ReactElement): 标题元素
*/
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const base = 'text-lg font-semibold leading-none tracking-tight'
  return <h3 className={[base, className].filter(Boolean).join(' ')} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const base = 'text-sm text-muted-foreground'
  return <p className={[base, className].filter(Boolean).join(' ')} {...props} />
}

/**
Function: CardContent

Description: 卡片内容容器

Parameters:
	props(DivProps): 原生 div 属性

Returns:
	element(React.ReactElement): 内容容器
*/
export function CardContent({ className, ...props }: DivProps) {
  const base = 'p-6'
  return <div className={[base, className].filter(Boolean).join(' ')} {...props} />
}

/**
Function: CardFooter

Description: 卡片底部容器

Parameters:
	props(DivProps): 原生 div 属性

Returns:
	element(React.ReactElement): 底部容器
*/
export function CardFooter({ className, ...props }: DivProps) {
  const base = 'flex items-center p-6 pt-0'
  return <div className={[base, className].filter(Boolean).join(' ')} {...props} />
}
