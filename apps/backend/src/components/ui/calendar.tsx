/**
 * File: calendar.tsx
 * Description: 日历组件，封装 shadcn/ui 基础日历
 */

'use client'

import * as React from 'react'
import {
  Calendar as BaseCalendar,
  CalendarDayButton as BaseCalendarDayButton,
} from '@/components/base/calendar'
import type { DayPickerProps } from 'react-day-picker'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/**
 * Type: CalendarProps
 *
 * Description: 日历组件的 props
 *
 * Properties:
 *     className(string): 自定义类名
 *     classNames(object): 各部分的自定义类名
 *     showOutsideDays(boolean): 是否显示外部日期
 *     captionLayout(string): 标题布局方式
 *     buttonVariant(string): 按钮变体
 *     formatters(object): 格式化器
 *     components(object): 自定义组件
 */
export type CalendarProps = React.ComponentProps<typeof BaseCalendar>

/**
 * Type: CalendarDayButtonProps
 *
 * Description: 日历日期按钮组件的 props
 */
export type CalendarDayButtonProps = React.ComponentProps<typeof BaseCalendarDayButton>

// ============================================
// 组件实现（Component Implementation）
// ============================================

/**
 * Function: Calendar
 *
 * Description: 日历组件，基于 react-day-picker 构建
 *
 * Parameters:
 *     props(CalendarProps): 日历配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的日历组件
 *
 * Example:
 *     // 基础用法
 *     <Calendar mode="single" selected={date} onSelect={setDate} />
 *
 *     // 范围选择
 *     <Calendar mode="range" selected={range} onSelect={setRange} />
 */
const Calendar = Object.assign(BaseCalendar, {
  displayName: 'Calendar'
})

/**
 * Function: CalendarDayButton
 *
 * Description: 日历中的日期按钮组件
 *
 * Parameters:
 *     props(CalendarDayButtonProps): 按钮配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的日期按钮组件
 */
const CalendarDayButton = Object.assign(BaseCalendarDayButton, {
  displayName: 'CalendarDayButton'
})

// ============================================
// 导出（Exports）
// ============================================

export { Calendar, CalendarDayButton }

// 导出 react-day-picker 的类型
export type { DayPickerProps }
