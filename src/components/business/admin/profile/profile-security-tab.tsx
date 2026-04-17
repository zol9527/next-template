// src/components/business/admin/profile/profile-security-tab.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Key, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

/**
 * Function: ProfileSecurityTab
 *
 * Description: 账户安全标签页，管理密码修改和 MFA 状态显示
 *
 * Returns:
 *   JSX.Element: 安全设置标签页组件
 */
export function ProfileSecurityTab() {
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async () => {
    // 表单验证
    if (!passwordForm.currentPassword) {
      toast({ title: '请输入当前密码', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: '新密码至少 8 位', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: '两次输入的密码不一致', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/v1/admin/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: '密码修改成功',
          description: '请使用新密码重新登录',
          variant: 'default',
        });
        // 清空表单
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: '修改失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 密码修改卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            修改密码
          </CardTitle>
          <CardDescription>定期更换密码可以保护您的账户安全</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              placeholder="请输入当前密码"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              placeholder="至少 8 位，包含大小写字母和数字"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="请再次输入新密码"
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className="gap-2"
            >
              {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              修改密码
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MFA 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            多因素认证 (MFA)
          </CardTitle>
          <CardDescription>启用 MFA 可以为您的账户提供额外的安全保护</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {mfaEnabled ? 'MFA 已启用' : 'MFA 未启用'}
                </p>
                {mfaEnabled && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {mfaEnabled
                  ? '您的账户已启用 TOTP 多因素认证'
                  : '建议启用 MFA 以增强账户安全性'}
              </p>
            </div>
            <Switch
              checked={mfaEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  // 跳转到 MFA 设置页面
                  window.location.href = '/admin/mfa-setup';
                } else {
                  // 禁用 MFA 逻辑
                  setMfaEnabled(false);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
