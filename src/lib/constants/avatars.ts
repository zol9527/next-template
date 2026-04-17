/**
 * File: src/lib/constants/avatars.ts
 * Description: 预设头像常量定义
 */

/**
 * 头像 ID 类型
 */
export type AvatarId = `avatar-${number}`;

/**
 * 预设头像数据结构
 */
export interface PresetAvatar {
  /** 头像唯一标识 */
  id: AvatarId;
  /** 头像图片地址（建议为本地 public 路径） */
  src: string;
  /** 头像名称 */
  name: string;
}

/**
 * 预设头像列表
 *
 * 提供了一组精选的本地头像，用户可以直接选择而无需上传
 */
export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'avatar-1', src: '/avatars/fresh-01.svg', name: '薄荷蓝' },
  { id: 'avatar-2', src: '/avatars/fresh-02.svg', name: '紫雾环' },
  { id: 'avatar-3', src: '/avatars/fresh-03.svg', name: '暖阳' },
  { id: 'avatar-4', src: '/avatars/fresh-04.svg', name: '青柠粉' },
  { id: 'avatar-5', src: '/avatars/fresh-05.svg', name: '海风' },
  { id: 'avatar-6', src: '/avatars/fresh-06.svg', name: '樱蓝三角' },
];

/**
 * 默认头像 ID
 */
export const DEFAULT_AVATAR_ID: AvatarId = 'avatar-1';

/**
 * 根据头像 ID 获取头像信息
 *
 * Function: getAvatarById
 *
 * Description: 根据 ID 从预设头像列表中查找对应的头像信息
 *
 * Parameters:
 *   id(string): 头像 ID
 *
 * Returns:
 *   avatar(PresetAvatar | undefined): 找到的头像信息，如果不存在则返回 undefined
 */
export function getAvatarById(id: string): PresetAvatar | undefined {
  return PRESET_AVATARS.find((avatar) => avatar.id === id);
}
