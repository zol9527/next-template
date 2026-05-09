/**
 * 图片预览工具
 */

/**
 * 预览单张图片
 * @param url - 图片 URL
 */
export function previewImage(url: string): void {
  if (!url) return;

  uni.previewImage({
    urls: [url],
    current: url,
  });
}

/**
 * 预览多张图片（画廊模式）
 * @param urls - 图片 URL 列表
 * @param current - 当前显示的图片 URL（默认第一张）
 */
export function previewImages(urls: string[], current?: string): void {
  if (!urls || urls.length === 0) return;

  uni.previewImage({
    urls,
    current: current || urls[0],
  });
}
