/**
 * MiniMax 图片生成 Provider
 *
 * Description: 封装 MiniMax 图片生成 API（image-01 模型）
 *   调用 MiniMax API 获取临时图片 URL，并提供下载辅助函数供 Service 层使用
 *
 * 架构说明:
 *   - 此模块位于基础设施层（src/lib/ai），不导入 Repository 或 Service
 *   - 临时 URL → 永久存储的转换由 Service 层编排（调用 downloadImageToBuffer + MediaAsset）
 */

import type {
  IAIImageProvider,
  ImageGenerationParams,
  ImageGenerationResult,
  ImageAspectRatio,
} from '../../core/types'

// ==================== 常量定义 ====================

/** MiniMax 图片生成 API 默认端点 */
const DEFAULT_BASE_URL = 'https://api.minimax.chat/v1'

/** MiniMax 默认图片模型 */
const DEFAULT_MODEL = 'image-01'

/** 默认宽高比 */
const DEFAULT_ASPECT_RATIO: ImageAspectRatio = '1:1'

/** 默认生成数量 */
const DEFAULT_N = 1

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 60_000

/** 图片下载超时时间（毫秒） */
const DOWNLOAD_TIMEOUT_MS = 30_000

// ==================== MiniMax API 类型定义 ====================

/** MiniMax 图片生成请求体 */
interface MiniMaxImageRequest {
  model: string
  prompt: string
  aspect_ratio?: string
  n?: number
}

/** MiniMax 图片生成响应体 */
interface MiniMaxImageResponse {
  base_resp?: {
    status_code: number
    status_msg: string
  }
  data?: Array<{
    url: string
  }>
}

// ==================== 辅助函数 ====================

/**
 * Function: validateMiniMaxResponse
 *
 * Description: 校验 MiniMax API 响应结构，确保 data 数组存在且非空
 *
 * Parameters:
 *   response(MiniMaxImageResponse): MiniMax API 返回的原始响应
 *
 * Returns:
 *   urls(string[]): 图片 URL 列表
 *
 * Throws:
 *   Error: 当响应结构异常或 API 返回错误码时
 */
function validateMiniMaxResponse(response: MiniMaxImageResponse): string[] {
  // 检查 base_resp 错误码
  if (response.base_resp && response.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax API error: [${response.base_resp.status_code}] ${response.base_resp.status_msg}`
    )
  }

  // 检查 data 字段
  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('MiniMax API 返回数据为空，未生成图片')
  }

  // 提取并校验 URL
  const urls: string[] = []
  for (const item of response.data) {
    if (!item.url || typeof item.url !== 'string') {
      throw new Error('MiniMax API 返回的图片 URL 无效')
    }
    urls.push(item.url)
  }

  return urls
}

// ==================== MiniMaxImageProvider 类 ====================

/**
 * MiniMaxImageProvider
 *
 * Description: MiniMax 图片生成 Provider，实现 IAIImageProvider 接口
 *   调用 MiniMax image-01 模型生成图片，返回临时 URL
 *   永久存储由 Service 层通过 downloadImageToBuffer + MediaAsset 完成
 */
export class MiniMaxImageProvider implements IAIImageProvider {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  /**
   * Function: constructor
   *
   * Description: 初始化 MiniMax 图片生成 Provider
   *
   * Parameters:
   *   options(object): 配置选项
   *     options.apiKey(string): MiniMax API Key
   *     options.baseUrl(string, optional): API 基础 URL，默认 https://api.minimax.chat/v1
   *     options.model(string, optional): 模型名称，默认 image-01
   */
  constructor(options: { apiKey: string; baseUrl?: string; model?: string }) {
    if (!options.apiKey) {
      throw new Error('MiniMax API Key 不能为空')
    }

    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.model = options.model ?? DEFAULT_MODEL
  }

  /**
   * Function: generateImage
   *
   * Description: 调用 MiniMax API 生成图片，返回临时 URL
   *   注意：返回的 URL 是临时 URL，需要由 Service 层下载并存储到 MediaAsset
   *
   * Parameters:
   *   params(ImageGenerationParams): 图片生成参数
   *     params.prompt(string): 生成提示词
   *     params.model(string, optional): 模型名称（覆盖默认值）
   *     params.aspectRatio(ImageAspectRatio, optional): 宽高比，默认 1:1
   *     params.n(number, optional): 生成数量，默认 1（当前仅支持 1）
   *
   * Returns:
   *   result(ImageGenerationResult): 生成结果
   *     result.url(string): 临时图片 URL
   *     result.assetId(undefined): 不包含 assetId，由 Service 层填充
   *
   * Throws:
   *   Error: 当 API 调用失败或响应异常时
   */
  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const model = params.model ?? this.model
    const aspectRatio = params.aspectRatio ?? DEFAULT_ASPECT_RATIO
    const n = params.n ?? DEFAULT_N

    // 构建请求体
    const requestBody: MiniMaxImageRequest = {
      model,
      prompt: params.prompt,
      aspect_ratio: aspectRatio,
      n,
    }

    // 调用 MiniMax API
    const endpoint = `${this.baseUrl}/image_generation`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // 检查 HTTP 状态码
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      throw new Error(
        `MiniMax API HTTP 错误: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    // 解析并校验响应
    const data = (await response.json()) as MiniMaxImageResponse
    const urls = validateMiniMaxResponse(data)

    // 返回第一张图片的 URL（当前仅支持单张生成）
    return {
      url: urls[0],
      // assetId 由 Service 层在存储到 MediaAsset 后填充
    }
  }
}

// ==================== 下载辅助函数 ====================

/**
 * Function: downloadImageToBuffer
 *
 * Description: 下载远程图片到内存 Buffer
 *   供 Service 层使用：下载 MiniMax 临时图片后存入 MediaAsset 获取永久 URL
 *
 * Parameters:
 *   url(string): 远程图片 URL（通常是 MiniMax 返回的临时 URL）
 *
 * Returns:
 *   result(object): 下载结果
 *     result.buffer(Buffer): 图片二进制数据
 *     result.contentType(string): MIME 类型，默认 image/png
 *
 * Throws:
 *   Error: 当下载失败或响应状态码非 2xx 时
 */
export async function downloadImageToBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`图片下载失败: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') ?? 'image/png'

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  }
}
