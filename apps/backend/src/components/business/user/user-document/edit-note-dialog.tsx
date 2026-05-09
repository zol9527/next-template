'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface EditNoteDialogProps {
  documentId: string
  documentName: string | null
  note: string | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdateNote: (params: { documentId: string; note: string }) => Promise<void>
}

export function EditNoteDialog({
  documentId,
  documentName,
  note,
  isOpen,
  onOpenChange,
  onUpdateNote,
}: EditNoteDialogProps) {
  const [localNote, setLocalNote] = React.useState(note || '')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async () => {
    if (!localNote.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdateNote({ documentId, note: localNote })
      setLocalNote('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>编辑备注</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {documentName}
        </DialogDescription>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="note">备注内容（1-500 字符）</Label>
            <Textarea
              id="note"
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="添加备注信息..."
              className="min-h-30 resize-none"
            />
          </div>
          <div className="flex items-end justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || !localNote.trim()}
              onClick={() => handleSubmit()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  保存备注
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
