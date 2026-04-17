// src/components/business/admin/mfa-setup/mfa-setup-page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/ui/admin-tabs';
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
import {
  Shield,
  Key,
  Smartphone,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

/**
 * Function: MfaSetupPage
 *
 * Description: MFA 设置页面主组件，支持 TOTP 密钥生成、验证和 MFA 启用/禁用
 *
 * Returns:
 *   JSX.Element: MFA 设置页面
 */
export function MfaSetupPage() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState({
    enabled: false,
    type: null as string | null,
    enabledAt: null as string | null,
  });

  // 设置流程状态
  const [setupStep, setSetupStep] = useState<'intro' | 'qr' | 'verify' | 'success'>('intro');
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  // 禁用 MFA 对话框
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  // 复制状态
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const loadMfaStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me/mfa');
      const data = await res.json();
      if (data.success) {
        setMfaStatus(data.data);
        if (data.data.enabled) {
          setSetupStep('success');
        }
      }
    } catch (_error) {
      toast({
        title: '加载失败',
        description: '无法加载 MFA 状态',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadMfaStatus();
  }, [loadMfaStatus]);

  const generateSecret = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me/mfa/setup/totp', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSetupData(data.data);
        setSetupStep('qr');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: '请输入 6 位验证码',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'MFA 已启用',
          description: '您的账户现在更加安全了',
        });
        setMfaStatus({
          enabled: true,
          type: 'totp',
          enabledAt: new Date().toISOString(),
        });
        setSetupStep('success');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: '验证失败',
        description: error instanceof Error ? error.message : '请检查验证码后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast({
        title: '请输入 6 位验证码',
        variant: 'destructive',
      });
      return;
    }

    setIsDisabling(true);
    try {
      const res = await fetch('/api/v1/admin/me/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: disableCode,
          confirmDisable: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'MFA 已禁用',
          description: '您的账户已不再使用多因素认证',
        });
        setMfaStatus({
          enabled: false,
          type: null,
          enabledAt: null,
        });
        setSetupStep('intro');
        setShowDisableDialog(false);
        setDisableCode('');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: '禁用失败',
        description: error instanceof Error ? error.message : '请检查后重试',
        variant: 'destructive',
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
    toast({
      title: '已复制',
      description: '内容已复制到剪贴板',
    });
  };

  if (isLoading && setupStep === 'intro') {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        className="gap-2"
        onClick={() => (window.location.href = '/admin/profile')}
      >
        <ArrowLeft className="h-4 w-4" />
        返回个人资料
      </Button>

      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MFA 设置</h1>
          <p className="text-muted-foreground">
            {mfaStatus.enabled
              ? '您的账户已启用多因素认证'
              : '启用多因素认证以增强账户安全'}
          </p>
        </div>
      </div>

      {/* 设置流程 */}
      {!mfaStatus.enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>启用 TOTP 多因素认证</CardTitle>
            <CardDescription>使用 Google Authenticator 或类似应用扫描二维码</CardDescription>
          </CardHeader>
          <CardContent>
            {setupStep === 'intro' && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">1. 下载验证器应用</h3>
                    <p className="text-sm text-muted-foreground">
                      推荐 Google Authenticator、Microsoft Authenticator 或 Authy
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">2. 扫描二维码或输入密钥</h3>
                    <p className="text-sm text-muted-foreground">
                      在验证器应用中扫描生成的二维码或手动输入密钥
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">3. 输入验证码完成验证</h3>
                    <p className="text-sm text-muted-foreground">
                      输入验证器应用显示的 6 位验证码完成 MFA 启用
                    </p>
                  </div>
                </div>

                <Button
                  onClick={generateSecret}
                  className="w-full"
                  size="lg"
                  data-testid="mfa-start-setup-btn"
                >
                  开始设置
                </Button>
              </div>
            )}

            {setupStep === 'qr' && setupData && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    {/* 这里应该显示真实的二维码图片 */}
                    <div className="w-48 h-48 bg-muted flex items-center justify-center">
                      <img
                        src={setupData.qrCodeUrl}
                        alt="MFA QR Code"
                        className="w-full h-full object-contain"
                        data-testid="mfa-qr-code-image"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    使用验证器应用扫描二维码
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>手动输入密钥</Label>
                  <div className="flex gap-2">
                    <Input
                      value={setupData.secret}
                      readOnly
                      className="font-mono bg-muted"
                      data-testid="mfa-secret-input"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(setupData.secret, 'secret')}
                      data-testid="mfa-copy-secret-btn"
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 备份码显示 */}
                <div className="space-y-2">
                  <Label>备份码（请妥善保存）</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {setupData.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-2 bg-muted rounded text-center font-mono text-sm"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      copyToClipboard(setupData.backupCodes.join('\n'), 'codes')
                    }
                  >
                    {copiedCodes ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    复制所有备份码
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verifyCode">验证码</Label>
                  <Input
                    id="verifyCode"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="输入验证器中的 6 位验证码"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    data-testid="mfa-verify-code-input"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSetupStep('intro')}
                    className="flex-1"
                    data-testid="mfa-back-btn"
                  >
                    返回
                  </Button>
                  <Button
                    onClick={verifyAndEnable}
                    disabled={verifyCode.length !== 6 || isLoading}
                    className="flex-1 gap-2"
                    data-testid="mfa-enable-btn"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    启用 MFA
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <AdminTabs defaultValue="status" className="space-y-6">
          <AdminTabsList>
            <AdminTabsTrigger value="status">MFA 状态</AdminTabsTrigger>
            <AdminTabsTrigger value="backup">备份码管理</AdminTabsTrigger>
          </AdminTabsList>

          <AdminTabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader data-testid="mfa-enabled-badge">
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
                  MFA 已启用
                </CardTitle>
                <CardDescription>
                  您的账户已启用 TOTP 多因素认证，登录时需要输入验证码
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">认证方式</p>
                    <p className="font-medium">TOTP (时间同步)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">启用时间</p>
                    <p className="font-medium">
                      {mfaStatus.enabledAt
                        ? new Date(mfaStatus.enabledAt).toLocaleString('zh-CN')
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">验证器应用设置</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. 打开您的验证器应用（如 Google Authenticator）</p>
                    <p>2. 扫描新的二维码或手动输入密钥</p>
                    <p>3. 输入生成的 6 位验证码</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // 重新设置 MFA 逻辑: 先清除旧数据，再生成新密钥
                      setSetupData(null);
                      setVerifyCode('');
                      setSetupStep('qr');
                      setMfaStatus((prev) => ({ ...prev, enabled: false }));
                      generateSecret();
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新设置验证器
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableDialog(true)}
                    className="gap-2"
                    data-testid="mfa-disable-button"
                  >
                    <Shield className="h-4 w-4" />
                    禁用 MFA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AdminTabsContent>

          <AdminTabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>备份码</CardTitle>
                <CardDescription>
                  备份码可用于在无法访问验证器应用时登录账户。每个备份码只能使用一次。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-warning">
                    <p className="font-medium mb-1">安全提示</p>
                    <p>
                      请安全保存备份码。如果您同时丢失验证器应用和备份码，可能无法恢复账户访问权限。
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // 重新生成备份码逻辑
                      toast({
                        title: '功能开发中',
                        description: '重新生成备份码功能即将上线',
                      });
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新生成备份码
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AdminTabsContent>
        </AdminTabs>
      )}

      {/* 禁用 MFA 确认对话框 */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              确认禁用 MFA?
            </AlertDialogTitle>
            <AlertDialogDescription>
              禁用 MFA 将降低您账户的安全性。禁用后，您只需要用户名和密码即可登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="disableCode">请输入验证码确认</Label>
            <Input
              id="disableCode"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="输入 6 位验证码"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              data-testid="mfa-disable-code-input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                disableMfa();
              }}
              disabled={disableCode.length !== 6 || isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="mfa-disable-confirm-button"
            >
              {isDisabling && <Loader2 className="h-4 w-4 animate-spin" />}
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
