// src/components/business/admin/profile/profile-devices-tab.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Laptop, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Function: ProfileDevicesTab
 *
 * Description: 登录设备管理标签页，显示当前登录会话列表并支持撤销会话
 *
 * Returns:
 *   JSX.Element: 设备管理标签页组件
 */
export function ProfileDevicesTab() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      deviceInfo: string;
      ipAddress: string;
      lastActive: string;
      isCurrent: boolean;
    }>
  >([]);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (_error) {
      toast({
        title: '加载失败',
        description: '无法加载会话列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/me/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: '已撤销',
          description: '该会话已成功注销',
          variant: 'default',
        });
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (_error) {
      toast({
        title: '操作失败',
        description: '无法撤销该会话',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeAllSessions = useCallback(async () => {
    setIsRevoking(true);
    try {
      const res = await fetch('/api/v1/admin/me/sessions', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: '已注销所有会话',
          description: '除当前会话外，其他所有会话已注销',
          variant: 'default',
        });
        // 重新加载，当前会话应该保留
        void loadSessions();
      }
    } catch (_error) {
      toast({
        title: '操作失败',
        description: '无法注销会话',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
      setShowLogoutAllDialog(false);
    }
  }, [loadSessions, toast]);

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('phone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>当前登录会话</CardTitle>
          <CardDescription>管理您在所有设备上的登录状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无活跃会话</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    {getDeviceIcon(session.deviceInfo)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.deviceInfo}</p>
                      {session.isCurrent && (
                        <Badge variant="default" className="text-xs">
                          当前设备
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      IP: {session.ipAddress} · 最后活跃: {formatDate(session.lastActive)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    <LogOut className="h-4 w-4" />
                    注销
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 注销所有其他会话 */}
      {sessions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              注销其他会话
            </CardTitle>
            <CardDescription>一键注销除当前设备外的所有登录会话</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowLogoutAllDialog(true)}
              disabled={isRevoking}
              className="gap-2"
            >
              {isRevoking && <Loader2 className="h-4 w-4 animate-spin" />}
              注销所有其他会话
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 确认对话框 */}
      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认注销所有会话?</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将注销除当前设备外的所有登录会话。其他设备上的用户将被强制退出登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllSessions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认注销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
