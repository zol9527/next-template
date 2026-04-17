'use client'

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import CharacterCount from '@tiptap/extension-character-count'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  Code,
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Image as ImageIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Eraser,
  Pilcrow
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaterialPicker } from './media/material-picker'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import type { LucideIcon } from 'lucide-react'

/**
Function: ToolbarButton

Description: 富文本编辑器工具栏按钮组件

Parameters:
    icon(LucideIcon): Lucide 图标组件
    onClick(function): 点击事件处理函数
    isActive(boolean): 是否处于激活状态
    tooltip(string): 工具提示文本

Returns:
    element(React.ReactElement): 工具栏按钮 UI
*/
const ToolbarButton = React.memo(({ 
  icon: Icon, 
  onClick, 
  isActive = false, 
  tooltip 
}: { 
  icon: LucideIcon
  onClick: () => void
  isActive?: boolean
  tooltip: string 
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? 'secondary' : 'ghost'}
          size="icon"
          className={cn(
            "h-8 w-8 transition-all",
            isActive ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-foreground/10"
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
))

ToolbarButton.displayName = 'ToolbarButton'

/**
Function: RichTextEditor
<BLANK LINE>
Description: 企业级富文本编辑器，基于 TipTap 构建。深度集成素材库，支持基础排版、链接插入及图片管理。
<BLANK LINE>
Parameters:
    value(string): 编辑器当前的 HTML 内容
    onChange(function): 内容变更回调
    placeholder(string): 占位文本
<BLANK LINE>
Returns:
    element(React.ReactElement): 富文本编辑器 UI
*/
export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false)

  // 1. 初始化编辑器
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      Color,
      CharacterCount,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4 border border-foreground/10 shadow-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3 bg-background/50',
      },
    },
  })

  // 同步外部状态（例如草稿恢复）
  // 标准化空内容比较：TipTap 将空内容标准化为 '<p></p>'，而外部 value 可能是空字符串 ''，
  // 不做标准化会导致 '' !== '<p></p>' 恒为 true，触发 setContent 无限循环
  React.useEffect(() => {
    if (editor) {
      const normalizedValue = value.trim() === '' ? '<p></p>' : value
      if (normalizedValue !== editor.getHTML()) {
        editor.commands.setContent(normalizedValue, { emitUpdate: false })
      }
    }
  }, [value, editor])

  if (!editor) return null

  // 3. 定义辅助函数 (在 editor 初始化之后)
  const handleInsertImage = (assets: AdminMediaAsset[]) => {
    assets.forEach(asset => {
      if (asset.url) {
        editor.chain().focus().setImage({ src: asset.url, alt: asset.objectKey }).run()
      }
    })
  }

  return (
    <div className="border border-foreground/10 overflow-hidden bg-background">
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-foreground/5 backdrop-blur-sm sticky top-0 z-10">
        <ToolbarButton 
          icon={Heading1} 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          isActive={editor.isActive('heading', { level: 1 })}
          tooltip="一级标题"
        />
        <ToolbarButton 
          icon={Heading2} 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          isActive={editor.isActive('heading', { level: 2 })}
          tooltip="二级标题"
        />
        <ToolbarButton 
          icon={Heading3} 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
          isActive={editor.isActive('heading', { level: 3 })}
          tooltip="三级标题"
        />
        <ToolbarButton 
          icon={Pilcrow} 
          onClick={() => editor.chain().focus().setParagraph().run()} 
          isActive={editor.isActive('paragraph')}
          tooltip="正文"
        />
        <div className="w-px h-4 bg-foreground/10 mx-1" />
        
        <ToolbarButton 
          icon={Bold} 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')}
          tooltip="加粗"
        />
        <ToolbarButton 
          icon={Italic} 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')}
          tooltip="斜体"
        />
        <ToolbarButton 
          icon={UnderlineIcon} 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          isActive={editor.isActive('underline')}
          tooltip="下划线"
        />
        <ToolbarButton 
          icon={Strikethrough} 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          isActive={editor.isActive('strike')}
          tooltip="删除线"
        />
        <ToolbarButton 
          icon={Code} 
          onClick={() => editor.chain().focus().toggleCode().run()} 
          isActive={editor.isActive('code')}
          tooltip="行内代码"
        />
        
        <div className="w-px h-4 bg-foreground/10 mx-1" />
        
        <ToolbarButton 
          icon={List} 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          isActive={editor.isActive('bulletList')}
          tooltip="无序列表"
        />
        <ToolbarButton 
          icon={ListOrdered} 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          isActive={editor.isActive('orderedList')}
          tooltip="有序列表"
        />
        <ToolbarButton 
          icon={Quote} 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          isActive={editor.isActive('blockquote')}
          tooltip="引用"
        />
        
        <div className="w-px h-4 bg-foreground/10 mx-1" />
        
        {/* 重要：集成素材库 */}
        <ToolbarButton 
          icon={ImageIcon} 
          onClick={() => setIsPickerOpen(true)} 
          tooltip="插入素材图"
        />

        <ToolbarButton 
          icon={Eraser} 
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} 
          tooltip="清除格式"
        />
        
        <div className="flex-1" />
        
        <ToolbarButton 
          icon={Undo} 
          onClick={() => editor.chain().focus().undo().run()} 
          tooltip="撤销"
        />
        <ToolbarButton 
          icon={Redo} 
          onClick={() => editor.chain().focus().redo().run()} 
          tooltip="重做"
        />
      </div>
      )}

      {/* 编辑区域 */}
      <EditorContent editor={editor} />

      {/* 底部信息栏 */}
      <div className="px-3 py-1 border-t bg-foreground/5 flex justify-between items-center text-[10px] text-foreground/40">
        <div className="flex items-center gap-4">
          <span>{editor.storage.characterCount?.characters?.() || 0} 字</span>
        </div>
        <div className="flex items-center gap-2">
          <Type className="h-3 w-3" />
          <span>TipTap 2.0 Engine</span>
        </div>
      </div>

      <MaterialPicker 
        open={isPickerOpen} 
        onOpenChange={setIsPickerOpen}
        onSelect={handleInsertImage}
        multiple={true}
      />
    </div>
  )
}
