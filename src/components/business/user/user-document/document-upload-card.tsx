'use client'

import * as React from 'react'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import { useUserDocuments } from './use-user-documents'
import type { DocumentType } from '@/contracts/dtos/user-document.dto'
import { DocumentTypeLabels, DocumentTypeEnum } from '@/contracts/dtos/user-document.dto'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export function DocumentUploadCard() {
  const [documentType, setDocumentType] = React.useState<DocumentType>('id_card')
  const [documentName, setDocumentName] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)

  const { upload } = useUserDocuments()
  const { toast } = useToast()

  // 上传处理
  const handleUpload = async () => {
    if (!file) {
      toast({ title: '请先选择文件', variant: 'destructive' })
      return
    }

    try {
      // 模拟上传进度
      setUploadProgress(0)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await upload.mutateAsync({
        documentType,
        documentName: documentName || undefined,
        file,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      toast({ title: '上传成功', variant: 'default' })

      // 重置表单
      setTimeout(() => {
        setFile(null)
        setPreview(null)
        setDocumentName('')
        setUploadProgress(0)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  // 文件选择处理
  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile)

    if (selectedFile) {
      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  // 拖拽事件处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  // 清除文件
  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setDocumentName('')
    setUploadProgress(0)
  }

  const isUploading = upload.isPending
  const canSubmit = !isUploading && file !== null

  return (
    <Card className="overflow-hidden sticky top-6">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          上传证件
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* 证件类型选择 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/70">
            证件类型
          </Label>
          <Select
            value={documentType}
            onValueChange={(value) => setDocumentType(value as DocumentType)}
            disabled={isUploading}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DocumentTypeEnum.options.map((type) => (
                <SelectItem key={type} value={type}>
                  {DocumentTypeLabels[type as DocumentType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 文件名输入（可选） */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/70">
            证件名称（可选）
          </Label>
          <Input
            placeholder="例如：本人身份证正面"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            disabled={isUploading}
          />
        </div>

        {/* 文件上传区域 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/70">
            选择文件
          </Label>
          <div
            className={cn(
              'relative border-2 border-dashed rounded-xl min-h-[200px] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer overflow-hidden',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border/20 bg-muted/5 hover:border-border/40 hover:bg-muted/10',
              file ? 'p-0' : 'p-6'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null
                handleFileSelect(selectedFile)
              }}
              disabled={isUploading}
            />

            {!file && (
              <>
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    点击或拖拽文件到此处
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持 JPG、PNG、WebP，最大 10MB
                  </p>
                </div>
              </>
            )}

            {file && preview && (
              <div className="relative w-full h-full min-h-[200px]">
                <Image
                  src={preview}
                  alt={file.name}
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center text-white space-y-2">
                    <FileText className="h-8 w-8 mx-auto" />
                    <p className="text-sm font-medium truncate px-4">
                      {file.name}
                    </p>
                    <p className="text-xs opacity-80">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* 清除按钮 */}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClear()
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 上传进度 */}
        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">上传中...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* 上传按钮 */}
        <Button
          onClick={handleUpload}
          disabled={!canSubmit}
          className="w-full h-12"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              确认上传
            </>
          )}
        </Button>

        {/* 错误提示 */}
        {upload.error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              {upload.error instanceof Error ? upload.error.message : '上传失败，请重试'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
