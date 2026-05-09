// src/components/business/admin/profile/profile-basic-info-tab.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarSelector } from '@/components/ui/avatar-selector';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getAvatarById, DEFAULT_AVATAR_ID, PRESET_AVATARS } from '@/lib/constants/avatars';
import { getAvatarUrl } from '@/lib/utils/avatar';

/**
 * Function: ProfileBasicInfoTab
 *
 * Description: 个人资料基本信息标签页，管理头像、昵称、邮箱、手机号等
 *
 * Returns:
 *   JSX.Element: 基本信息标签页组件
 */
export function ProfileBasicInfoTab() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    phone: '',
    avatarUrl: '',
    avatarId: DEFAULT_AVATAR_ID,
  });

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/me');
      const data = await res.json();
      if (data.success) {
        // 旧数据可能是 emoji: 前缀，这里不再展示/映射 emoji，统一回退到本地头像
        const avatarUrl = (data.data.avatarUrl || '').trim();
        const avatarId = PRESET_AVATARS.find((a) => a.src === avatarUrl)?.id || DEFAULT_AVATAR_ID;

        setProfile((prev) => ({
          ...prev,
          username: data.data.username || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          avatarUrl: avatarUrl.startsWith('emoji:') ? '' : avatarUrl,
          avatarId,
        }));
      }
    } catch (_error) {
      toast({
        title: '加载失败',
        description: '无法加载个人资料，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 加载个人信息
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/v1/admin/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          email: profile.email,
          phone: profile.phone,
          avatarId: profile.avatarId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: '保存成功',
          description: '个人资料已更新',
          variant: 'default',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const preset = getAvatarById(profile.avatarId);
  const avatarSrc = getAvatarUrl({
    avatarUrl: preset?.src || profile.avatarUrl,
    username: profile.username,
  });

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
    <Card>
      <CardHeader>
        <CardTitle>基本信息</CardTitle>
        <CardDescription>更新您的个人资料和联系方式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 头像区域 */}
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <>
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="text-2xl">
                  {profile.username?.[0] || 'A'}
                </AvatarFallback>
              </>
            </Avatar>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              >
                {showAvatarSelector ? '收起头像选择器' : '选择头像'}
              </Button>
              <p className="text-xs text-muted-foreground">
                从预设头像中选择一个，或者保持默认
              </p>
            </div>
          </div>

          {/* 头像选择器 */}
          {showAvatarSelector && (
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="text-sm font-medium">选择头像</h4>
              <AvatarSelector
                value={profile.avatarId}
                onChange={(avatarId) => setProfile((prev) => ({ ...prev, avatarId }))}
              />
            </div>
          )}
        </div>

        {/* 表单区域 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={profile.username}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="请输入用户名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="请输入邮箱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="请输入手机号"
            />
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存修改
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
