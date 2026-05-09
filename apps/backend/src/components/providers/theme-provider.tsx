import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

/**
Function: ThemeProvider

Description: 主题提供者组件
使用 next-themes 实现明暗主题切换,支持系统主题检测

Parameters:
	children(React.ReactNode): 子组件
	...props(ThemeProviderProps): next-themes 的其他配置选项

Returns:
	element(React.ReactElement): ThemeProvider 组件
*/
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
