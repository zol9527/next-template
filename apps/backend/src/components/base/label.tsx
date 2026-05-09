import * as React from 'react'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

/**
Function: Label

Description: 一个基础 label 组件，用于表单字段标题

Parameters:
	props(LabelProps): 原生 label 属性

Returns:
	element(React.ReactElement): label 元素
*/
export function Label({ className, ...props }: LabelProps) {
  const base = 'text-sm font-medium text-foreground'
  return <label className={[base, className].filter(Boolean).join(' ')} {...props} />
}
