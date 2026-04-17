import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

const DropdownContext = React.createContext<{ 
  open: boolean; 
  setOpen: (open: boolean) => void;
  triggerRect: DOMRect | null;
  setTriggerRect: (rect: DOMRect | null) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
} | null>(null)

/**
Component: DropdownMenu

Description: 下拉菜单根组件，支持受控和非受控模式。
*/
interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DropdownMenu = ({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) => {
  // 支持受控和非受控模式
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 如果点击既不在触发器容器内，也不在 Portal 内容容器内，则关闭
      const isInsideTrigger = containerRef.current?.contains(target)
      const isInsideContent = contentRef.current?.contains(target)

      if (!isInsideTrigger && !isInsideContent) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, setOpen])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRect, setTriggerRect, contentRef }}>
      <div className="relative inline-block text-left" ref={containerRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

/**
Component: DropdownMenuTrigger

Description: 下拉菜单触发器。
*/
interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  asChild?: boolean
}

const DropdownMenuTrigger = ({ children, asChild, ...props }: DropdownMenuTriggerProps) => {
  const context = React.useContext(DropdownContext)
  if (!context) return null
  const { open, setOpen, setTriggerRect } = context

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setTriggerRect(rect)
    setOpen(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLDivElement>>, {
      onClick: handleClick,
      ...props
    })
  }

  return (
    <div onClick={handleClick} {...props}>
      {children}
    </div>
  )
}

/**
Component: DropdownMenuContent

Description: 下拉菜单内容，使用 Portal 挂载到 body 以免受父级 overflow 限制。
*/
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  align?: "left" | "right"
  matchTriggerWidth?: boolean
}

const DropdownMenuContent = ({
  children,
  className = "",
  align = "left",
  matchTriggerWidth = false,
  ...props
}: DropdownMenuContentProps) => {
  const context = React.useContext(DropdownContext)
  const [mounted, setMounted] = React.useState(false)

  // 所有 hooks 必须无条件调用，确保每次渲染时的 hook 顺序一致
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 在所有 hooks 之后进行条件返回
  if (!context || !context.open || !context.triggerRect) return null

  const { triggerRect, contentRef } = context

  if (!mounted) return null

  // 计算内容宽度：matchTriggerWidth 时使用触发器宽度，否则使用固定宽度 192px (w-48)
  const contentWidth = matchTriggerWidth ? triggerRect.width : 192

  return createPortal(
    <div
      ref={contentRef}
      data-dropdown-content
      className={cn(
        "fixed z-100 mt-2 overflow-hidden rounded-2xl border border-border/10 bg-background/80 backdrop-blur-xl p-1 shadow-xl animate-in fade-in zoom-in-95 duration-200",
        !matchTriggerWidth && "w-48",
        className
      )}
      style={{
        top: triggerRect.bottom + 8,
        left: align === "right"
          ? triggerRect.right - contentWidth
          : triggerRect.left,
        width: matchTriggerWidth ? triggerRect.width : undefined,
      }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

/**
Component: DropdownMenuItem

Description: 下拉菜单项。
*/
interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  onSelect?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

const DropdownMenuItem = ({ children, onClick, onSelect, className = "", disabled, ...props }: DropdownMenuItemProps) => {
  const context = React.useContext(DropdownContext)
  if (!context) return null
  const { setOpen } = context
  
  return (
    <button
      {...props}
      disabled={disabled}
      type="button"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground/70 outline-none transition-colors hover:bg-muted/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={(e) => {
        // 先阻止冒泡，确保逻辑执行完再关闭
        e.stopPropagation()
        
        if (onSelect) {
          onSelect(e)
        } else if (onClick) {
          onClick(e)
        }

        // 如果没有调用 preventDefault，则关闭菜单
        if (!e.defaultPrevented) {
          setTimeout(() => setOpen(false), 10)
        }
      }}
    >
      {children}
    </button>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}

/**
Component: DropdownMenuSeparator

Description: 下拉菜单分隔线。
*/
const DropdownMenuSeparator = ({ className = "" }: { className?: string }) => {
  return (
    <div className={cn("h-px my-1 bg-muted/10", className)} />
  )
}
