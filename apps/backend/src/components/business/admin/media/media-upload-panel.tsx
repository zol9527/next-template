"use client";

/**
 * File: media-upload-panel.tsx
 * Description: 媒体上传面板组件，支持拖拽上传和进度显示
 */

import * as React from "react";
import { Upload, FileIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FILE_INPUT_ACCEPT_VALUE } from "@/lib/constants/file-types";
import { useToast } from "@/components/ui/toast";
import { useAdminMediaAssets } from "@/components/context/admin-media-assets-context";

/**
 * Function: formatBytes
 *
 * Description: 将字节数转换为友好的字符串格式（KB, MB 等）
 *
 * Parameters:
 *    bytes(number): 字节数
 *    decimals(number): 小数点位数
 *
 * Returns:
 *    formatted(string): 格式化后的字符串
 */
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Function: MediaUploadPanel
 *
 * Description: 媒体上传面板组件，支持拖拽上传和进度显示
 *
 * Returns:
 *    element(React.ReactElement): 上传面板 UI
 */
export function MediaUploadPanel() {
  const { toast } = useToast();
  const { uploadAsset } = useAdminMediaAssets();

  // 文件选择状态
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = React.useState(false);

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 清除文件选择
  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "已取消",
      description: "文件选择已清除",
      variant: "default",
    });
  };

  // 执行上传
  const handleUpload = () => {
    if (!file) {
      toast({
        title: "请选择文件",
        description: "请先选择要上传的文件",
        variant: "destructive",
      });
      return;
    }

    void (async () => {
      setUploadProgress(0);
      setIsUploading(true);
      try {
        await uploadAsset(file, {
          onProgress: (info) => setUploadProgress(info.percent),
        });

        toast({
          title: "上传成功",
          description: "媒体已同步到库中",
          variant: "default",
        });
        setFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        toast({
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传失败",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    })();
  };

  return (
    // 使用卡片组件包裹上传面板
    <Card className="overflow-hidden">
      {/* 上传面板头部 */}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          上传新媒体
        </CardTitle>
      </CardHeader>

      {/* 上传面板内容 */}
      <CardContent>
        <div
          className={cn(
            "relative flex flex-col items-center justify-between rounded-2xl border-2 border-dashed transition-all duration-300 min-h-70 px-6 py-6 text-center cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border/20 hover:border-border/30 bg-muted/5",
            isUploading && "pointer-events-none opacity-60"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            id="media-upload-file-input"
            ref={fileInputRef}
            type="file"
            accept={FILE_INPUT_ACCEPT_VALUE}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {/* 拖拽上传提示 - 没有文件时显示 */}
          {!file && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 text-primary">
                <Upload className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-medium text-foreground">
                  拖拽文件到此处 或{" "}
                  <span className="text-primary hover:underline">点击选择</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  支持图片、视频等常见格式，最大 100MB
                </p>
              </div>
            </div>
          )}

          {/* 文件信息和上传按钮 - 有文件时显示 */}
          {file && (
            <div className="w-full max-w-md space-y-4">
              {/* 文件信息卡片 */}
              <div className="flex flex-col gap-4 items-center">
                {/* 文件图标 */}
                <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileIcon className="w-6 h-6" />
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  {/* 名称以及大小 */}
                  <div className="flex flex-col items-center gap-2">
                    <p
                      className="text-sm font-semibold truncate flex-1"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0 px-2 py-0.5 rounded-md bg-muted/50">
                      {formatBytes(file.size)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {file.type || "未知类型"}
                    </p>
                  </div>
                  {/* 类型 */}
                </div>
              </div>

              {isUploading && (
                <div className="w-full space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs font-medium text-primary text-right">
                    {uploadProgress}%
                  </p>
                </div>
              )}

              {!isUploading && (
                <div className="flex justify-center gap-3">
                  {/* 取消按钮 */}
                  <Button
                    size="sm"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    取消
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                  >
                    确认上传
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
