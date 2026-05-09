export const FALLBACK_AVATAR_SRCS = [
  '/avatars/fresh-01.svg',
  '/avatars/fresh-02.svg',
  '/avatars/fresh-03.svg',
  '/avatars/fresh-04.svg',
  '/avatars/fresh-05.svg',
  '/avatars/fresh-06.svg',
] as const

/**
Function: isEmojiAvatarUrl

Description: 判断头像 URL 是否为历史遗留的 emoji 格式（如 "emoji:🎉"）。

Parameters:
	avatarUrl(string | null | undefined): 头像 URL

Returns:
	isEmoji(boolean): 是否为 emoji 头像格式
*/
export function isEmojiAvatarUrl(avatarUrl: string | null | undefined) {
  return typeof avatarUrl === 'string' && avatarUrl.trim().startsWith('emoji:')
}

/**
Function: hashStringToIndex

Description: 将字符串稳定哈希为索引，用于在固定头像列表中选择回退头像。

Parameters:
	value(string): 用于哈希的字符串
	modulo(number): 取模大小（通常为数组长度）

Returns:
	index(number): 取模后的索引
*/
export function hashStringToIndex(value: string, modulo: number) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return modulo === 0 ? 0 : hash % modulo
}

/**
Function: getSafeAvatarSrc

Description: 生成安全可用的头像 src；仅允许本地路径或 data URL，其余（含 emoji: 前缀）自动回退到内置本地头像。

Parameters:
	params(object): 头像相关输入参数
	params.avatarUrl(string | null | undefined): 头像 URL
	params.userId(string | null | undefined): 用户 ID（用于稳定选择回退头像）
	params.username(string | null | undefined): 用户名（用于稳定选择回退头像）

Returns:
	src(string): 可用于 img/next-image 的安全 src
*/
export function getAvatarUrl(params: {
  avatarUrl?: string | null
  userId?: string | null
  username?: string | null
}) {
  const seed = params.userId || params.username || 'anonymous'
  const fallback =
    FALLBACK_AVATAR_SRCS[hashStringToIndex(seed, FALLBACK_AVATAR_SRCS.length)]

  const raw = (params.avatarUrl ?? '').trim()
  if (!raw) return fallback

  // 显式禁用历史 emoji 头像值，避免前端渲染异常。
  if (isEmojiAvatarUrl(raw)) return fallback

  // 只允许本地静态资源或 data URL。
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('data:image/')) return raw

  return fallback
}
